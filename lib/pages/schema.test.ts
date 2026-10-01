import { describe, expect, it } from 'vitest';
import { defaultPage, defaultSection, fill, normalizePage } from './defaults';
import { isValidSection, linkSchema, PAGE_IDS, PAGE_SECTIONS, pageSectionsSchema } from './schema';

describe('page sections', () => {
  it('every default page is valid and stats/testimonials start hidden', () => {
    for (const page of PAGE_IDS) {
      const r = pageSectionsSchema(page).safeParse(defaultPage(page));
      expect(r.success, page).toBe(true);
    }
    expect(defaultSection('stats').enabled).toBe(false);
    expect(defaultSection('testimonials').enabled).toBe(false);
  });

  it('allows reordering, but the hero must stay first and every section appears once', () => {
    const home = defaultPage('home');
    const swapped = [home[0], ...home.slice(1).reverse()];
    expect(pageSectionsSchema('home').safeParse(swapped).success).toBe(true);
    expect(pageSectionsSchema('home').safeParse([...home.slice(1), home[0]]).success).toBe(false);
    expect(pageSectionsSchema('home').safeParse(home.slice(0, -1)).success).toBe(false);
    expect(pageSectionsSchema('home').safeParse([...home.slice(0, -1), home[1]]).success).toBe(false);
    // A section from another page doesn't belong here.
    expect(
      pageSectionsSchema('about').safeParse([...defaultPage('about'), defaultSection('home.cities')]).success,
    ).toBe(false);
  });

  it('rejects unknown fields, empty headings and too much text', () => {
    const hero = defaultSection('home.hero');
    expect(isValidSection({ ...hero, html: '<b>x</b>' })).toBe(false);
    expect(isValidSection({ ...hero, heading: '  ' })).toBe(false);
    expect(isValidSection({ ...hero, heading: 'x'.repeat(91) })).toBe(false);
    expect(isValidSection({ ...hero, image: { path: 'a', url: 'javascript:alert(1)' } })).toBe(false);
    // HTML in text is fine to store: it is always rendered as text.
    expect(isValidSection({ ...hero, heading: '<script>alert(1)</script>' })).toBe(true);
  });

  it('list limits: 1–4 stats, 1–6 quotes, exactly 3 steps', () => {
    const stats = defaultSection('stats');
    expect(isValidSection({ ...stats, items: [] })).toBe(false);
    expect(isValidSection({ ...stats, items: Array(5).fill(stats.items[0]) })).toBe(false);
    const how = defaultSection('home.howItWorks');
    expect(isValidSection({ ...how, steps: how.steps.slice(0, 2) })).toBe(false);
  });

  it('button links: site paths, anchors or https only', () => {
    for (const ok of ['/events', '/events?city=Austin', '#register', 'https://example.com/x'])
      expect(linkSchema.safeParse(ok).success, ok).toBe(true);
    for (const bad of [
      'javascript:alert(1)',
      '//evil.com',
      'http://example.com',
      'data:text/html,x',
      'events',
    ])
      expect(linkSchema.safeParse(bad).success, bad).toBe(false);
  });

  it('normalizes stored pages: drops junk, adds new sections, repairs invalid ones, hero first', () => {
    const about = defaultPage('about');
    const stored = [
      { ...about[2], enabled: false },
      { type: 'home.cities', enabled: true, title: 'x' }, // other page
      { type: 'nope' },
      { ...about[0], heading: '' }, // invalid → default
      { ...about[2] }, // duplicate
    ];
    const out = normalizePage('about', stored, isValidSection);
    expect(out.map((s) => s.type)).toEqual(['about.hero', 'about.values', 'stats']);
    expect(out[0]).toEqual(about[0]);
    expect(out[1]!.enabled).toBe(false);
    expect(normalizePage('home', null, isValidSection).map((s) => s.type)).toEqual(PAGE_SECTIONS.home);
  });

  it('fills the marketplace name', () => {
    expect(fill('{marketplace} is great. {marketplace}!', 'TicketExpert')).toBe(
      'TicketExpert is great. TicketExpert!',
    );
  });
});
