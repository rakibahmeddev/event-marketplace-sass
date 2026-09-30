/** WCAG 2.x contrast helpers for tenant brand colours. */

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

export const WHITE = '#FFFFFF';
export const INK = '#1A1A2E';
/** WCAG AA for normal-size text. */
export const AA = 4.5;

/** Buttons use white text on the primary colour and ink text on the accent colour (design 01). */
export function brandContrastProblems(
  primary: string,
  accent: string,
): { primaryColor?: string; accentColor?: string } {
  const out: { primaryColor?: string; accentColor?: string } = {};
  const p = contrastRatio(primary, WHITE);
  if (p < AA)
    out.primaryColor = `Too light for white button text (${p.toFixed(1)}:1, needs ${AA}:1). Try a darker shade.`;
  const a = contrastRatio(accent, INK);
  if (a < AA)
    out.accentColor = `Too dark for the dark button text (${a.toFixed(1)}:1, needs ${AA}:1). Try a lighter shade.`;
  return out;
}
