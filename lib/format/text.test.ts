import { describe, expect, it } from 'vitest';
import { organizerSlugPattern, paragraphs, searchWords, slugify } from './text';

describe('slugify', () => {
  it('makes URL-safe slugs', () => {
    expect(slugify('Neon Tides Live — Summer Tour Finale')).toBe('neon-tides-live-summer-tour-finale');
    expect(slugify('Café Night & Jazz!')).toBe('cafe-night-and-jazz');
    expect(slugify('  ---  ')).toBe('');
  });
});

describe('organizerSlugPattern', () => {
  it('accepts simple slugs and rejects edge cases', () => {
    expect(organizerSlugPattern.test('pulse-live')).toBe(true);
    for (const bad of ['a', '-pulse', 'pulse-', 'Pulse', 'pulse_live', 'x'.repeat(41)])
      expect(organizerSlugPattern.test(bad)).toBe(false);
  });
});

describe('searchWords', () => {
  it('collects unique lowercase words', () => {
    expect(searchWords('Sunset Rooftop Jazz', 'Pulse Live', 'Los Angeles', 'jazz')).toEqual([
      'sunset',
      'rooftop',
      'jazz',
      'pulse',
      'live',
      'los',
      'angeles',
    ]);
  });
});

describe('paragraphs', () => {
  it('splits on blank lines', () => {
    expect(paragraphs('One.\n\nTwo\nlines.\n\n\n')).toEqual(['One.', 'Two\nlines.']);
  });
});
