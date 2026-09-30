/** URL slug: lowercase ascii words joined by hyphens, max 60 chars. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** Profile URLs organizers may not take. */
export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'dashboard',
  'events',
  'login',
  'register',
  'new',
  'edit',
  'settings',
  'scanner',
]);

export const organizerSlugPattern = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

/**
 * Lowercased whole words for the simple keyword search (events.searchWords, array-contains).
 * Words shorter than 2 characters and duplicates are dropped; capped at 40 words.
 */
export function searchWords(...texts: (string | null | undefined)[]): string[] {
  const words = new Set<string>();
  for (const text of texts) {
    for (const w of (text ?? '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)) {
      if (w.length >= 2) words.add(w);
    }
  }
  return [...words].slice(0, 40);
}

/** Splits a plain-text description into paragraphs (no HTML is ever rendered from user text). */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
