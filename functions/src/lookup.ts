import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { AppConfig } from './config.js';
import { NormalizedNumber, normalizePhoneNumber } from './normalize.js';
import { LookupError, LookupPayload, fetchVeriphone } from './veriphone.js';

const firestore = admin.firestore();
const realtimeDb = admin.database();

const LOOKUPS_COLLECTION = 'lookupResults';

interface LookupRecord {
  payload: LookupPayload;
  normalized: NormalizedNumber;
  createdAt: string;
  updatedAt: string;
}

function sanitizeKey(e164: string): string {
  return e164.replace(/^\+/, '');
}

function realtimeCachePath(config: AppConfig, normalized: NormalizedNumber): string {
  const base = config.realtimeCachePath.replace(/\/+$/, '');
  return `${base}/${sanitizeKey(normalized.e164)}`;
}

async function readRealtimeCache(config: AppConfig, normalized: NormalizedNumber): Promise<LookupPayload | null> {
  const path = realtimeCachePath(config, normalized);
  const snapshot = await realtimeDb.ref(path).get();
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.val() as { payload?: LookupPayload; cachedAt?: number };
  if (!data?.payload) {
    return null;
  }

  const cachedAt = data.cachedAt ?? 0;
  const ttl = config.cacheTtlSeconds * 1000;
  if (Date.now() - cachedAt > ttl) {
    // Expired cache entry.
    realtimeDb.ref(path).remove().catch((err) => logger.warn('Failed to purge expired cache', err));
    return null;
  }

  const payload = { ...data.payload };
  payload.sources = Array.from(new Set([...(payload.sources ?? []), 'cache']));
  return payload;
}

async function writeRealtimeCache(
  config: AppConfig,
  normalized: NormalizedNumber,
  payload: LookupPayload,
): Promise<void> {
  const path = realtimeCachePath(config, normalized);
  await realtimeDb.ref(path).set({ payload, cachedAt: Date.now() }).catch((err) => {
    logger.warn('Failed to write realtime cache', err);
  });
}

async function readFirestore(normalized: NormalizedNumber): Promise<LookupRecord | null> {
  const docRef = firestore.collection(LOOKUPS_COLLECTION).doc(sanitizeKey(normalized.e164));
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return null;
  }
  const data = snapshot.data();
  if (!data) {
    return null;
  }
  const payload = data.payload as LookupPayload | undefined;
  if (!payload) {
    return null;
  }
  payload.sources = Array.from(new Set([...(payload.sources ?? []), 'database']));
  return {
    payload,
    normalized: (data.normalized as NormalizedNumber) ?? normalized,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
  };
}

async function writeFirestore(normalized: NormalizedNumber, payload: LookupPayload): Promise<void> {
  const docRef = firestore.collection(LOOKUPS_COLLECTION).doc(sanitizeKey(normalized.e164));
  const snapshot = await docRef.get();
  const nowIso = new Date().toISOString();

  const data: Record<string, unknown> = {
    payload,
    normalized,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtIso: nowIso,
  };

  if (!snapshot.exists) {
    data.createdAt = admin.firestore.FieldValue.serverTimestamp();
    data.createdAtIso = nowIso;
  }

  await docRef.set(data, { merge: true });
}

function enrichPayload(payload: LookupPayload, normalized: NormalizedNumber): LookupPayload {
  const enriched: LookupPayload = { ...payload };
  enriched.number = {
    international_format: payload.number?.international_format ?? normalized.e164,
    national_format: payload.number?.national_format ?? normalized.national,
    country_code: payload.number?.country_code ?? normalized.countryCode,
  };
  enriched.country = {
    name: payload.country?.name ?? normalized.countryName,
  };
  enriched.normalized = {
    e164: normalized.e164,
    national: normalized.national,
    country_code: normalized.countryCode,
    region_code: normalized.regionCode,
    country_name: normalized.countryName,
  };
  return enriched;
}

export async function lookupNumber(value: string, config: AppConfig): Promise<LookupPayload> {
  const normalized = normalizePhoneNumber(value, config.defaultRegion);

  const cached = await readRealtimeCache(config, normalized);
  if (cached) {
    return enrichPayload(cached, normalized);
  }

  const stored = await readFirestore(normalized);
  if (stored?.payload) {
    const payload = enrichPayload(stored.payload, normalized);
    await writeRealtimeCache(config, normalized, payload);
    return payload;
  }

  let result: LookupPayload;
  try {
    result = await fetchVeriphone(normalized.e164, config);
  } catch (error) {
    if (error instanceof LookupError) {
      throw error;
    }
    throw new LookupError('Lookup provider error', 502);
  }

  const enriched = enrichPayload(result, normalized);

  await Promise.all([
    writeRealtimeCache(config, normalized, enriched),
    writeFirestore(normalized, enriched).catch((err) => logger.warn('Failed to persist lookup', err)),
  ]);

  return enriched;
}
