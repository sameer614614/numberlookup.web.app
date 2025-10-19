import fetch, { Headers } from 'node-fetch';
import { AppConfig } from './config.js';

export interface LookupPayload {
  source: string;
  number: {
    international_format?: string;
    national_format?: string;
    country_code?: string;
  };
  carrier: {
    name?: string;
    type?: string;
  };
  country: {
    name?: string;
  };
  location: {
    city?: string;
    state?: string;
  };
  reputation: {
    spam_score?: string | number | null;
    last_seen?: string | null;
  };
  sources: string[];
  normalized?: Record<string, unknown>;
}

export class LookupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function fetchVeriphone(number: string, config: AppConfig): Promise<LookupPayload> {
  if (!config.veriphoneApiKey) {
    throw new LookupError('Lookup provider unavailable', 503);
  }

  const headers = new Headers({ Accept: 'application/json' });
  const url = new URL(config.veriphoneBaseUrl);
  url.searchParams.set('phone', number);
  url.searchParams.set('key', config.veriphoneApiKey);

  const response = await fetch(url, { headers });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    const detail =
      (payload?.status_message as string | undefined) ||
      (payload?.message as string | undefined) ||
      response.statusText;
    throw new LookupError(detail || 'Lookup failed', response.status);
  }

  return {
    source: 'veriphone',
    number: {
      international_format: payload?.international_number as string | undefined,
      national_format: payload?.local_number as string | undefined,
      country_code: payload?.country_code as string | undefined,
    },
    carrier: {
      name: payload?.carrier as string | undefined,
      type: payload?.phone_type as string | undefined,
    },
    country: {
      name: payload?.country_name as string | undefined,
    },
    location: {
      city: payload?.region as string | undefined,
      state: payload?.region as string | undefined,
    },
    reputation: {
      spam_score: (payload?.spam_score as string | number | null | undefined) ?? undefined,
      last_seen: (payload?.last_seen as string | null | undefined) ?? undefined,
    },
    sources: ['veriphone'],
  };
}
