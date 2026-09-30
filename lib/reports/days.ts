import { utcToZonedInput } from '../format/time.ts';

/**
 * Calendar days as "YYYY-MM-DD" strings in the marketplace's timezone. Sales rollups are keyed by these,
 * so day arithmetic stays pure calendar maths (no DST surprises).
 */
export function dayKey(instant: Date, timeZone: string): string {
  return utcToZonedInput(instant, timeZone).date;
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(v: string): boolean {
  const m = DAY.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.toISOString().slice(0, 10) === v;
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Inclusive number of days from `from` to `to`. */
export function dayCount(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

/** Every day from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export const RANGE_KEYS = ['7d', '30d', '90d', 'month', 'last-month', 'custom'] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export const MAX_RANGE_DAYS = 366;

export type ResolvedRange = {
  key: RangeKey;
  from: string;
  to: string;
  days: number;
  /** The same number of days immediately before, for "vs previous period". */
  prevFrom: string;
  prevTo: string;
};

/**
 * Range from search params. Unknown or invalid input falls back to the last 30 days; custom ranges
 * are clamped to MAX_RANGE_DAYS and swapped when reversed.
 */
export function resolveRange(
  input: { range?: string; from?: string; to?: string },
  now: Date,
  timeZone: string,
  allowed: readonly RangeKey[] = RANGE_KEYS,
): ResolvedRange {
  const today = dayKey(now, timeZone);
  const key = (allowed as readonly string[]).includes(input.range ?? '') ? (input.range as RangeKey) : '30d';
  let from: string;
  let to = today;
  if (key === '7d' || key === '30d' || key === '90d') {
    from = addDays(today, -(Number.parseInt(key, 10) - 1));
  } else if (key === 'month') {
    from = `${today.slice(0, 8)}01`;
  } else if (key === 'last-month') {
    to = addDays(`${today.slice(0, 8)}01`, -1);
    from = `${to.slice(0, 8)}01`;
  } else {
    const a = input.from && isDayKey(input.from) ? input.from : addDays(today, -29);
    const b = input.to && isDayKey(input.to) ? input.to : today;
    [from, to] = a <= b ? [a, b] : [b, a];
    if (dayCount(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
  }
  const days = dayCount(from, to);
  return { key, from, to, days, prevFrom: addDays(from, -days), prevTo: addDays(from, -1) };
}
