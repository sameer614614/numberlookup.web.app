import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface NormalizedNumber {
  e164: string;
  national: string;
  countryCode: string;
  regionCode?: string;
  countryName?: string;
  location?: string;
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function normalizePhoneNumber(input: string, defaultRegion: string): NormalizedNumber {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Phone number is required');
  }

  const phone = parsePhoneNumberFromString(trimmed, defaultRegion as any);
  if (!phone || !phone.isValid()) {
    throw new Error('Invalid phone number');
  }

  const regionCode = phone.country;

  return {
    e164: phone.number,
    national: phone.formatNational(),
    countryCode: `+${phone.countryCallingCode}`,
    regionCode,
    countryName: regionCode ? regionNames.of(regionCode) ?? undefined : undefined,
  };
}
