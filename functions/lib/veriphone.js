import fetch, { Headers } from 'node-fetch';
export class LookupError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
export async function fetchVeriphone(number, config) {
    if (!config.veriphoneApiKey) {
        throw new LookupError('Lookup provider unavailable', 503);
    }
    const headers = new Headers({ Accept: 'application/json' });
    const url = new URL(config.veriphoneBaseUrl);
    url.searchParams.set('phone', number);
    url.searchParams.set('key', config.veriphoneApiKey);
    const response = await fetch(url, { headers });
    const payload = (await response.json().catch(() => null));
    if (!response.ok) {
        const detail = payload?.status_message ||
            payload?.message ||
            response.statusText;
        throw new LookupError(detail || 'Lookup failed', response.status);
    }
    return {
        source: 'veriphone',
        number: {
            international_format: payload?.international_number,
            national_format: payload?.local_number,
            country_code: payload?.country_code,
        },
        carrier: {
            name: payload?.carrier,
            type: payload?.phone_type,
        },
        country: {
            name: payload?.country_name,
        },
        location: {
            city: payload?.region,
            state: payload?.region,
        },
        reputation: {
            spam_score: payload?.spam_score ?? undefined,
            last_seen: payload?.last_seen ?? undefined,
        },
        sources: ['veriphone'],
    };
}
