import admin, { firestore, realtimeDb } from './firebase.js';
import { logger } from 'firebase-functions';
import { AppConfig } from './config.js';
import { NormalizedNumber, normalizePhoneNumber } from './normalize.js';
import { LookupError, LookupPayload, fetchVeriphone } from './veriphone.js';

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

function sanitizeForJson<T>(value: T): T {
  if (value === undefined || value === null) {
    return value as unknown as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  if (Array.isArray(value)) {
    const sanitized = value
      .map((item) => sanitizeForJson(item))
      .filter((item) => item !== undefined);
    return sanitized as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeForJson(val);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result as T;
  }

  return value;
}

async function writeRealtimeCache(
  config: AppConfig,
  normalized: NormalizedNumber,
  payload: LookupPayload,
): Promise<void> {
  const path = realtimeCachePath(config, normalized);
  const sanitizedPayload = sanitizeForJson(payload);
  await realtimeDb
    .ref(path)
    .set({ payload: sanitizedPayload, cachedAt: Date.now() })
    .catch((err) => {
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

  const sanitizedPayload = sanitizeForJson(payload);
  const sanitizedNormalized = sanitizeForJson(normalized);

  const data: Record<string, unknown> = {
    payload: sanitizedPayload,
    normalized: sanitizedNormalized,
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
  const sanitized = sanitizeForJson(enriched);

  await Promise.all([
    writeRealtimeCache(config, normalized, sanitized),
    writeFirestore(normalized, sanitized).catch((err) => logger.warn('Failed to persist lookup', err)),
  ]);

  return sanitized;
}
