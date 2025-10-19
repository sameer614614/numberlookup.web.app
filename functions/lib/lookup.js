import admin, { firestore, realtimeDb } from './firebase.js';
import { logger } from 'firebase-functions';
import { normalizePhoneNumber } from './normalize.js';
import { LookupError, fetchVeriphone } from './veriphone.js';
const LOOKUPS_COLLECTION = 'lookupResults';
function sanitizeKey(e164) {
    return e164.replace(/^\+/, '');
}
function realtimeCachePath(config, normalized) {
    const base = config.realtimeCachePath.replace(/\/+$/, '');
    return `${base}/${sanitizeKey(normalized.e164)}`;
}
async function readRealtimeCache(config, normalized) {
    const path = realtimeCachePath(config, normalized);
    const snapshot = await realtimeDb.ref(path).get();
    if (!snapshot.exists()) {
        return null;
    }
    const data = snapshot.val();
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
function sanitizeForJson(value) {
    if (value === undefined || value === null) {
        return value;
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (Array.isArray(value)) {
        const sanitized = value
            .map((item) => sanitizeForJson(item))
            .filter((item) => item !== undefined);
        return sanitized;
    }
    if (typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            const sanitized = sanitizeForJson(val);
            if (sanitized !== undefined) {
                result[key] = sanitized;
            }
        }
        return result;
    }
    return value;
}
async function writeRealtimeCache(config, normalized, payload) {
    const path = realtimeCachePath(config, normalized);
    const sanitizedPayload = sanitizeForJson(payload);
    await realtimeDb
        .ref(path)
        .set({ payload: sanitizedPayload, cachedAt: Date.now() })
        .catch((err) => {
        logger.warn('Failed to write realtime cache', err);
    });
}
async function readFirestore(normalized) {
    const docRef = firestore.collection(LOOKUPS_COLLECTION).doc(sanitizeKey(normalized.e164));
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        return null;
    }
    const data = snapshot.data();
    if (!data) {
        return null;
    }
    const payload = data.payload;
    if (!payload) {
        return null;
    }
    payload.sources = Array.from(new Set([...(payload.sources ?? []), 'database']));
    return {
        payload,
        normalized: data.normalized ?? normalized,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    };
}
async function writeFirestore(normalized, payload) {
    const docRef = firestore.collection(LOOKUPS_COLLECTION).doc(sanitizeKey(normalized.e164));
    const snapshot = await docRef.get();
    const nowIso = new Date().toISOString();
    const sanitizedPayload = sanitizeForJson(payload);
    const sanitizedNormalized = sanitizeForJson(normalized);
    const data = {
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
function enrichPayload(payload, normalized) {
    const enriched = { ...payload };
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
export async function lookupNumber(value, config) {
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
    let result;
    try {
        result = await fetchVeriphone(normalized.e164, config);
    }
    catch (error) {
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
