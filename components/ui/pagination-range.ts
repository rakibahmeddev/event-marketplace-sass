export type PageItem = number | 'ellipsis';

/**
 * Page numbers to show, e.g. (1, 28) → [1, 2, 3, 'ellipsis', 28].
 * Always shows first, last and the current page with one neighbour each side.
 */
export function paginationRange(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: PageItem[] = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) out.push('ellipsis');
    out.push(p);
  });
  return out;
}
