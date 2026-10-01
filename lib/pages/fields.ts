import type { PageId, SectionType } from './schema';

/** Editor form description per section type (mirrors lib/pages/schema.ts limits). */
export type FieldSpec = {
  key: string;
  label: string;
  kind: 'text' | 'textarea' | 'image' | 'link';
  max: number;
  hint?: string;
  optional?: boolean;
};
export type ListSpec = {
  key: string;
  label: string;
  itemLabel: string;
  min: number;
  max: number;
  fields: FieldSpec[];
  blank: Record<string, string>;
};
export type SectionSpec = {
  label: string;
  /** What the section shows, for the admin. */
  description: string;
  fields: FieldSpec[];
  lists?: ListSpec[];
};

const NAME_HINT = 'You can write {marketplace} to insert the marketplace name.';
const titleText = (max = 200): FieldSpec[] => [
  { key: 'title', label: 'Title', kind: 'text', max: 60 },
  { key: 'text', label: 'Text', kind: 'textarea', max },
];

export const SECTION_SPECS: Record<SectionType, SectionSpec> = {
  'home.hero': {
    label: 'Hero',
    description: 'Big photo, headline and the event search. Always shown first.',
    fields: [
      { key: 'heading', label: 'Heading', kind: 'text', max: 90, hint: NAME_HINT },
      { key: 'subheading', label: 'Text under the heading', kind: 'textarea', max: 240, optional: true },
      {
        key: 'image',
        label: 'Background photo',
        kind: 'image',
        max: 0,
        hint: 'Wide photo, at least 1600 px. Empty = default.',
      },
    ],
  },
  'home.categories': {
    label: 'Categories',
    description: 'Category shortcuts. Managed under Admin → Categories.',
    fields: [],
  },
  'home.trending': {
    label: 'Trending events',
    description: 'Best-selling upcoming events, filled in automatically.',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', max: 60 },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', max: 120, optional: true },
    ],
  },
  'home.weekend': {
    label: 'This weekend',
    description: 'Events happening this weekend. Hidden when there are none.',
    fields: [{ key: 'title', label: 'Title', kind: 'text', max: 60 }],
  },
  'home.cities': {
    label: 'Browse by city',
    description: 'Cities with upcoming events. Hidden with fewer than two cities.',
    fields: [{ key: 'title', label: 'Title', kind: 'text', max: 60 }],
  },
  'home.organizers': {
    label: 'Featured organizers',
    description: 'Approved organizers. Hidden when there are none.',
    fields: [{ key: 'title', label: 'Title', kind: 'text', max: 60 }],
  },
  'home.forOrganizers': {
    label: 'For organizers',
    description: 'Violet banner inviting organizers to sell tickets.',
    fields: [
      { key: 'eyebrow', label: 'Small label', kind: 'text', max: 40, optional: true },
      { key: 'heading', label: 'Heading', kind: 'text', max: 90, hint: NAME_HINT },
      { key: 'ctaLabel', label: 'Button label', kind: 'text', max: 40 },
      {
        key: 'ctaHref',
        label: 'Button link',
        kind: 'link',
        max: 300,
        hint: 'A site path like /become-an-organizer or an https:// link.',
      },
      { key: 'image', label: 'Photo', kind: 'image', max: 0, hint: 'Empty = default.' },
    ],
    lists: [
      {
        key: 'perks',
        label: 'Highlights',
        itemLabel: 'Highlight',
        min: 3,
        max: 3,
        fields: titleText(200),
        blank: { title: '', text: '' },
      },
    ],
  },
  'home.howItWorks': {
    label: 'How it works',
    description: 'Three steps from finding an event to getting in.',
    fields: [
      { key: 'title', label: 'Title', kind: 'text', max: 60 },
      { key: 'subtitle', label: 'Subtitle', kind: 'text', max: 160, optional: true },
    ],
    lists: [
      {
        key: 'steps',
        label: 'Steps',
        itemLabel: 'Step',
        min: 3,
        max: 3,
        fields: titleText(200),
        blank: { title: '', text: '' },
      },
    ],
  },
  'about.hero': {
    label: 'Intro',
    description: 'Page title, introduction and a large photo. Always shown first.',
    fields: [
      { key: 'eyebrow', label: 'Small label', kind: 'text', max: 40, optional: true },
      { key: 'heading', label: 'Heading', kind: 'text', max: 90, hint: NAME_HINT },
      { key: 'text', label: 'Introduction', kind: 'textarea', max: 400, optional: true, hint: NAME_HINT },
      { key: 'image', label: 'Photo', kind: 'image', max: 0, hint: 'Empty = default.' },
    ],
  },
  'about.values': {
    label: 'Values',
    description: 'Three cards about what the marketplace stands for.',
    fields: [],
    lists: [
      {
        key: 'items',
        label: 'Cards',
        itemLabel: 'Card',
        min: 3,
        max: 3,
        fields: titleText(200),
        blank: { title: '', text: '' },
      },
    ],
  },
  'become.hero': {
    label: 'Intro',
    description: 'Headline for organizers. The button jumps to the sign-up form. Always shown first.',
    fields: [
      { key: 'eyebrow', label: 'Small label', kind: 'text', max: 40, optional: true },
      { key: 'heading', label: 'Heading', kind: 'text', max: 90, hint: NAME_HINT },
      { key: 'text', label: 'Text', kind: 'textarea', max: 300, optional: true },
      { key: 'ctaLabel', label: 'Button label', kind: 'text', max: 40 },
      {
        key: 'image',
        label: 'Picture',
        kind: 'image',
        max: 0,
        hint: 'Empty = the dashboard and scanner picture.',
      },
    ],
  },
  stats: {
    label: 'Numbers',
    description: 'Up to four figures, e.g. “1,200+ organizers”. Use real numbers only.',
    fields: [{ key: 'title', label: 'Title (optional)', kind: 'text', max: 60, optional: true }],
    lists: [
      {
        key: 'items',
        label: 'Figures',
        itemLabel: 'Figure',
        min: 1,
        max: 4,
        fields: [
          { key: 'value', label: 'Number', kind: 'text', max: 12 },
          { key: 'label', label: 'Label', kind: 'text', max: 40 },
        ],
        blank: { value: '', label: '' },
      },
    ],
  },
  testimonials: {
    label: 'Testimonials',
    description: 'Quotes from real attendees or organizers (with their permission).',
    fields: [{ key: 'title', label: 'Title', kind: 'text', max: 60 }],
    lists: [
      {
        key: 'quotes',
        label: 'Quotes',
        itemLabel: 'Quote',
        min: 1,
        max: 6,
        fields: [
          { key: 'text', label: 'Quote', kind: 'textarea', max: 280 },
          { key: 'name', label: 'Name', kind: 'text', max: 60 },
          { key: 'role', label: 'Who they are', kind: 'text', max: 60, optional: true },
        ],
        blank: { text: '', name: '', role: '' },
      },
    ],
  },
};

export const PAGE_META: Record<PageId, { label: string; path: string; description: string }> = {
  home: { label: 'Home', path: '/', description: 'The front page of the marketplace.' },
  about: { label: 'About', path: '/about', description: 'Who you are and what you stand for.' },
  'become-organizer': {
    label: 'Become an organizer',
    path: '/become-an-organizer',
    description: 'Sign-up page for organizers. Pricing and the form stay as they are.',
  },
};
