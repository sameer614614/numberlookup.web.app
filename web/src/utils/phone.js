const NANP_COUNTRY_CODE = '+1';

export function analyzePhoneInput(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ready: false, sanitized: '', reason: null, countryHint: null, type: 'empty' };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    const sanitized = `+${digitsOnly}`;
    if (!/^\+\d{6,15}$/.test(sanitized)) {
      return {
        ready: false,
        sanitized: '',
        reason: 'Invalid number format',
        countryHint: null,
        type: 'invalid',
      };
    }
    const isNanp = sanitized.startsWith(NANP_COUNTRY_CODE);
    return {
      ready: true,
      sanitized,
      reason: null,
      countryHint: isNanp ? 'US/CA' : 'INTL',
      type: isNanp ? 'nanp' : 'international',
    };
  }

  if (!digitsOnly) {
    return {
      ready: false,
      sanitized: '',
      reason: 'Enter numbers only',
      countryHint: null,
      type: 'invalid',
    };
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return {
      ready: true,
      sanitized: `+${digitsOnly}`,
      reason: null,
      countryHint: 'US/CA',
      type: 'nanp',
    };
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return {
      ready: true,
      sanitized: `+1${digitsOnly.slice(1)}`,
      reason: null,
      countryHint: 'US/CA',
      type: 'nanp',
    };
  }

  if (digitsOnly.length === 10) {
    return {
      ready: true,
      sanitized: `+1${digitsOnly}`,
      reason: null,
      countryHint: 'US/CA',
      type: 'nanp',
    };
  }

  if (digitsOnly.length >= 6) {
    return {
      ready: false,
      sanitized: '',
      reason: 'International numbers must include the +country code.',
      countryHint: 'INTL',
      type: 'needsPlus',
    };
  }

  return {
    ready: false,
    sanitized: '',
    reason: 'Number is too short.',
    countryHint: null,
    type: 'invalid',
  };
}

export function buildShareMessage(payload) {
  if (!payload) {
    return 'No lookup result available.';
  }
  const normalized = payload.normalized ?? {};
  const countryName = payload.country?.name || normalized.country_name || 'Unknown country';
  const international = payload.number?.international_format || normalized.e164 || 'Unknown number';
  const carrierName = payload.carrier?.name || 'Unknown carrier';
  const spamScore = payload.reputation?.spam_score ?? 'n/a';

  return [
    `CallerID result for ${international}`,
    `Country: ${countryName}`,
    `Carrier: ${carrierName}`,
    `Spam score: ${spamScore}`,
  ].join('\n');
}
