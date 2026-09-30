import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cityPhoto, STOCK } from './stock';

describe('stock images', () => {
  it('maps known cities case-insensitively, Brooklyn to New York', () => {
    expect(cityPhoto(' Seattle ')).toBe('/images/city-seattle.webp');
    expect(cityPhoto('brooklyn')).toBe('/images/city-new-york.webp');
    expect(cityPhoto('Springfield')).toBeNull();
  });

  it('every referenced file exists in /public', () => {
    const paths = [
      ...Object.values(STOCK),
      ...['New York', 'Los Angeles', 'Chicago', 'Austin', 'Miami', 'Seattle'].map((c) => cityPhoto(c)!),
    ];
    for (const p of paths) expect(existsSync(`public${p}`), p).toBe(true);
  });
});
