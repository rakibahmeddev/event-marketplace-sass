import { describe, expect, it } from 'vitest';
import { brandContrastProblems, contrastRatio } from './contrast';

describe('contrast', () => {
  it('computes WCAG ratios (design 01 labels round these to 7.1 and 6.6)', () => {
    expect(contrastRatio('#5B2EE0', '#FFFFFF')).toBeCloseTo(7.21, 1);
    expect(contrastRatio('#FF6B4A', '#1A1A2E')).toBeCloseTo(6.05, 1);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });
  it('accepts the default brand colours', () => {
    expect(brandContrastProblems('#5B2EE0', '#FF6B4A')).toEqual({});
  });
  it('rejects a light primary and a dark accent', () => {
    const p = brandContrastProblems('#FFD400', '#2B2B2B');
    expect(p.primaryColor).toMatch(/Too light/);
    expect(p.accentColor).toMatch(/Too dark/);
  });
});
