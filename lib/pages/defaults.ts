import { PAGE_SECTIONS, type PageId, type Section, type SectionType } from './schema';

/**
 * Built-in content: what every marketplace shows until its admin publishes changes. Copy matches the
 * original pages. "{marketplace}" is replaced with the marketplace name when rendering.
 * Stats and testimonials start off with obvious placeholders so nothing made-up goes live by accident.
 */
const DEFAULTS: { [T in SectionType]: Extract<Section, { type: T }> } = {
  'home.hero': {
    type: 'home.hero',
    enabled: true,
    heading: 'Find the nights you’ll talk about for years.',
    subheading:
      'Concerts, matches, workshops and after-dark adventures — from local organizers you can trust. Tickets land in your inbox as a QR code.',
    image: null,
  },
  'home.categories': { type: 'home.categories', enabled: true },
  'home.trending': {
    type: 'home.trending',
    enabled: true,
    title: 'Trending events',
    subtitle: 'What people are booking right now',
  },
  'home.weekend': { type: 'home.weekend', enabled: true, title: 'Upcoming this weekend' },
  'home.cities': { type: 'home.cities', enabled: true, title: 'Browse by city' },
  'home.organizers': { type: 'home.organizers', enabled: true, title: 'Featured organizers' },
  'home.forOrganizers': {
    type: 'home.forOrganizers',
    enabled: true,
    eyebrow: 'For organizers',
    heading: 'Sell tickets with us. Keep more of every sale.',
    perks: [
      { title: 'Easy setup', text: 'Publish your first event in minutes.' },
      { title: 'QR check-in', text: 'Free scanner for your door staff.' },
      { title: 'Clear fees', text: 'One transparent fee, shown upfront.' },
    ],
    ctaLabel: 'Create your event',
    ctaHref: '/become-an-organizer',
    image: null,
  },
  'home.howItWorks': {
    type: 'home.howItWorks',
    enabled: true,
    title: 'How it works',
    subtitle: 'From “what’s on?” to through the door in three steps',
    steps: [
      {
        title: 'Discover',
        text: 'Search by city, date or vibe and find something worth leaving the house for.',
      },
      {
        title: 'Book securely',
        text: 'Pay by card. Your tickets are held for 10 minutes while you check out.',
      },
      {
        title: 'Scan & enjoy',
        text: 'Your QR ticket arrives by email and in your account. Show it at the door.',
      },
    ],
  },
  'about.hero': {
    type: 'about.hero',
    enabled: true,
    eyebrow: 'About us',
    heading: 'We help people show up for the things they love.',
    text: '{marketplace} is a marketplace where independent organizers sell tickets directly to their community — with fair fees and instant QR tickets.',
    image: null,
  },
  'about.values': {
    type: 'about.values',
    enabled: true,
    items: [
      { title: 'Fair by default', text: 'One clear fee, shown upfront. No surprise charges at checkout.' },
      {
        title: 'Organizers first',
        text: 'The tools big promoters have, sized for a Tuesday night workshop.',
      },
      {
        title: 'Safe to buy',
        text: 'Reviewed organizers, secure card payments and tickets you can check anytime in your account.',
      },
    ],
  },
  'become.hero': {
    type: 'become.hero',
    enabled: true,
    eyebrow: 'For event organizers',
    heading: 'Sell out your next event. Keep the crowd coming back.',
    text: 'Create your event page, sell tickets and scan guests in with your phone — all from one dashboard. Free to start.',
    ctaLabel: 'Start selling — it’s free',
    image: null,
  },
  stats: {
    type: 'stats',
    enabled: false,
    title: '',
    items: [
      { value: '0', label: 'Replace with a real number' },
      { value: '0', label: 'Replace with a real number' },
      { value: '0', label: 'Replace with a real number' },
    ],
  },
  testimonials: {
    type: 'testimonials',
    enabled: false,
    title: 'Loved by fans & organizers',
    quotes: [
      { text: 'Add a real quote from an attendee or organizer.', name: 'Their name', role: 'Attendee' },
      { text: 'Add a real quote from an attendee or organizer.', name: 'Their name', role: 'Organizer' },
      { text: 'Add a real quote from an attendee or organizer.', name: 'Their name', role: 'Attendee' },
    ],
  },
};

export function defaultSection<T extends SectionType>(type: T): Extract<Section, { type: T }> {
  return structuredClone(DEFAULTS[type]);
}

export function defaultPage(page: PageId): Section[] {
  return PAGE_SECTIONS[page].map((t) => defaultSection(t));
}

/**
 * Stored sections → a valid page: unknown or duplicate types are dropped, section types added in later
 * releases are appended from the defaults, and the hero is moved first. Invalid stored sections fall back
 * to their defaults (validated by the caller via `isValid`).
 */
export function normalizePage(
  page: PageId,
  stored: unknown[] | null | undefined,
  isValid: (s: unknown) => s is Section,
): Section[] {
  if (!stored) return defaultPage(page);
  const allowed = PAGE_SECTIONS[page];
  const seen = new Set<SectionType>();
  const out: Section[] = [];
  for (const raw of stored) {
    const type = (raw as { type?: unknown })?.type as SectionType;
    if (!allowed.includes(type) || seen.has(type)) continue;
    seen.add(type);
    out.push(isValid(raw) ? raw : defaultSection(type));
  }
  for (const t of allowed) if (!seen.has(t)) out.push(defaultSection(t));
  const hero = out.findIndex((s) => s.type === allowed[0]);
  if (hero > 0) out.unshift(...out.splice(hero, 1));
  return out;
}

/** "{marketplace}" → the marketplace name. */
export function fill(text: string, marketplace: string): string {
  return text.replaceAll('{marketplace}', marketplace);
}
