/** Axis maths for the bar charts (pure). */

/** Smallest "nice" number ≥ value: 1, 2, 2.5 or 5 × 10^n. Zero → 0. */
export function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= value) return m * exp;
  return 10 * exp;
}

/** Y axis: top value and evenly spaced ticks from top to 0. Top is divisible into `steps` nice parts. */
export function yAxis(max: number, steps = 4): { top: number; ticks: number[] } {
  const top = max > 0 ? niceCeil(max / steps) * steps : steps;
  return { top, ticks: Array.from({ length: steps + 1 }, (_, i) => top - (top / steps) * i) };
}

/** Indexes of `count` evenly spaced x-axis labels (always first and last). */
export function labelIndexes(length: number, count = 5): number[] {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const out = new Set<number>();
  for (let i = 0; i < count; i++) out.add(Math.round((i * (length - 1)) / (count - 1)));
  return [...out];
}
