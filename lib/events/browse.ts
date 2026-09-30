import { z } from 'zod';
import { dateRange, zonedToUtc } from '@/lib/format/time';
import { searchWords } from '@/lib/format/text';
import type { EventFilters } from './repository';

/** Browse URL parameters. Anything invalid is dropped rather than erroring (shareable URLs). */
const paramsSchema = z.object({
  category: z
    .string()
    .regex(/^[a-z0-9-]{1,64}$/)
    .optional()
    .catch(undefined),
  city: z.string().trim().min(1).max(80).optional().catch(undefined),
  date: z
    .union([z.enum(['today', 'tomorrow', 'weekend']), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .optional()
    .catch(undefined),
  price: z.enum(['free', 'paid']).optional().catch(undefined),
  type: z.enum(['in-person', 'online']).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  view: z.enum(['grid', 'list']).optional().catch(undefined),
  after: z
    .string()
    .regex(/^[A-Za-z0-9]{1,40}$/)
    .optional()
    .catch(undefined),
  before: z
    .string()
    .regex(/^[A-Za-z0-9]{1,40}$/)
    .optional()
    .catch(undefined),
});
export type BrowseParams = z.infer<typeof paramsSchema>;

export function parseBrowseParams(raw: Record<string, string | string[] | undefined>): BrowseParams {
  const flat = Object.fromEntries(
    Object.entries(raw)
      .map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      .filter(([, v]) => v !== ''),
  );
  return paramsSchema.parse(flat);
}

/** URL params → repository filters, in the marketplace's timezone. */
export function toFilters(
  p: BrowseParams,
  timeZone: string,
  now: Date,
): EventFilters & { extraWords: string[] } {
  const f: EventFilters & { extraWords: string[] } = { extraWords: [] };
  if (p.category) f.category = p.category;
  if (p.city) f.city = p.city;
  if (p.price) f.isFree = p.price === 'free';
  if (p.type) f.isOnline = p.type === 'online';
  if (p.date === 'today' || p.date === 'tomorrow' || p.date === 'weekend') {
    const r = dateRange(p.date, now, timeZone);
    f.from = r.from;
    f.to = r.to;
  } else if (p.date) {
    const from = zonedToUtc(p.date, '00:00', timeZone);
    if (from) {
      f.from = from;
      f.to = new Date(from.getTime() + 24 * 3600_000);
    }
  }
  // Keyword search: first word via the index (array-contains), the rest filtered on the page.
  const words = searchWords(p.q);
  if (words[0]) f.word = words[0];
  f.extraWords = words.slice(1);
  return f;
}

/** Link to the browse page with some params changed (undefined removes); resets pagination. */
export function browseHref(
  current: BrowseParams,
  changes: Partial<Record<keyof BrowseParams, string | undefined>>,
): string {
  const next: Record<string, string | undefined> = {
    ...current,
    after: undefined,
    before: undefined,
    ...changes,
  };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/events?${s}` : '/events';
}
