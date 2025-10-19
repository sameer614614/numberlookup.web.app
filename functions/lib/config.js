import * as functions from 'firebase-functions';
function readNumber(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
let cachedConfig = null;
export function getConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const runtimeConfig = functions.config?.() ?? {};
    const veriphoneConfig = runtimeConfig.veriphone ?? {};
    const appConfig = runtimeConfig.app ?? {};
    cachedConfig = {
        veriphoneApiKey: process.env.VERIPHONE_API_KEY ?? veriphoneConfig.key,
        veriphoneBaseUrl: process.env.VERIPHONE_BASE_URL ?? veriphoneConfig.base_url ?? 'https://api.veriphone.io/v2/verify',
        defaultRegion: process.env.DEFAULT_REGION ?? appConfig.default_region ?? 'US',
        cacheTtlSeconds: readNumber(process.env.CACHE_TTL_SECONDS ?? appConfig.cache_ttl, 3600),
        postsPrefix: process.env.POSTS_PREFIX ?? appConfig.posts_prefix ?? 'posts/',
        realtimeCachePath: process.env.REALTIME_CACHE_PATH ?? appConfig.realtime_cache_path ?? 'cache/lookups',
    };
    return cachedConfig;
}
