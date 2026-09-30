/** Money is always integer minor units (cents). Never floats. */
export type Cents = number;

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function formatMoney(cents: Cents, currency: string, locale = 'en-US'): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 10 ** digits === 0 ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(cents / 10 ** digits);
}

/** Axis / chart labels: 420000 → "$4.2K", 0 → "$0". */
export function formatMoneyCompact(cents: Cents, currency: string, locale = 'en-US'): string {
  const digits = minorDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(cents / 10 ** digits);
}

/** "12.50" → 1250. Returns null for anything that is not a valid non-negative amount. */
export function parseMoney(input: string, currency: string): Cents | null {
  const digits = minorDigits(currency);
  const trimmed = input.trim().replace(/,/g, '');
  const re = digits === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`);
  if (!re.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.split('.');
  const cents = Number(whole) * 10 ** digits + Number(frac.padEnd(digits, '0') || 0);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Plain number string for form inputs, e.g. 1250 → "12.50". */
export function centsToInput(cents: Cents, currency: string): string {
  const digits = minorDigits(currency);
  return digits === 0 ? String(cents) : (cents / 10 ** digits).toFixed(digits);
}

function minorDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ??
    2
  );
}

/** Card label: "Free", "From $45". */
export function priceFromLabel(minPrice: Cents | null, currency: string): string {
  if (minPrice === null) return 'Tickets soon';
  if (minPrice === 0) return 'Free';
  return `From ${formatMoney(minPrice, currency)}`;
}
