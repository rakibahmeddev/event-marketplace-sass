import { z } from 'zod';

/**
 * Editable marketing pages (Admin → Pages). Each page is an ordered list of sections; every section type
 * appears exactly once per page, the hero is always first, and the admin can only toggle, reorder and edit
 * the text and images of the sections defined here. Text is rendered as plain text (never HTML).
 */
export const PAGE_IDS = ['home', 'about', 'become-organizer'] as const;
export type PageId = (typeof PAGE_IDS)[number];

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, label = 'This field') =>
  z.string().trim().min(1, `${label} is required`).max(max);

/** Site paths ("/events?x=1", "#register") or https:// links. No javascript:, data:, protocol-relative. */
export const linkSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) => /^\/(?!\/)[^\s]*$/.test(v) || /^#[A-Za-z0-9_-]+$/.test(v) || /^https:\/\/[^\s/]+[^\s]*$/i.test(v),
    'Use a site path like /events or a full https:// link',
  );

/** Images are referenced by Storage path in edits; the server turns paths into { path, url }. */
export const imageRefSchema = z
  .object({ path: z.string().min(1).max(300), url: z.url({ protocol: /^https?$/ }) })
  .strict();
export type PageImage = z.infer<typeof imageRefSchema>;
const image = imageRefSchema.nullable();

const item = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const titled = { title: required(60, 'Title'), text: required(200, 'Text') };

const base = { enabled: z.boolean() };

// ---------- section types ----------
export const sectionSchemas = {
  'home.hero': z.object({ ...base, heading: required(90, 'Heading'), subheading: text(240), image }).strict(),
  'home.categories': z.object({ ...base }).strict(),
  'home.trending': z.object({ ...base, title: required(60, 'Title'), subtitle: text(120) }).strict(),
  'home.weekend': z.object({ ...base, title: required(60, 'Title') }).strict(),
  'home.cities': z.object({ ...base, title: required(60, 'Title') }).strict(),
  'home.organizers': z.object({ ...base, title: required(60, 'Title') }).strict(),
  'home.forOrganizers': z
    .object({
      ...base,
      eyebrow: text(40),
      heading: required(90, 'Heading'),
      perks: z.array(item(titled)).length(3),
      ctaLabel: required(40, 'Button label'),
      ctaHref: linkSchema,
      image,
    })
    .strict(),
  'home.howItWorks': z
    .object({
      ...base,
      title: required(60, 'Title'),
      subtitle: text(160),
      steps: z.array(item(titled)).length(3),
    })
    .strict(),
  'about.hero': z
    .object({ ...base, eyebrow: text(40), heading: required(90, 'Heading'), text: text(400), image })
    .strict(),
  'about.values': z.object({ ...base, items: z.array(item(titled)).length(3) }).strict(),
  'become.hero': z
    .object({
      ...base,
      eyebrow: text(40),
      heading: required(90, 'Heading'),
      text: text(300),
      ctaLabel: required(40, 'Button label'),
      image,
    })
    .strict(),
  stats: z
    .object({
      ...base,
      title: text(60),
      items: z
        .array(item({ value: required(12, 'Number'), label: required(40, 'Label') }))
        .min(1)
        .max(4),
    })
    .strict(),
  testimonials: z
    .object({
      ...base,
      title: required(60, 'Title'),
      quotes: z
        .array(item({ text: required(280, 'Quote'), name: required(60, 'Name'), role: text(60) }))
        .min(1)
        .max(6),
    })
    .strict(),
} as const;

export type SectionType = keyof typeof sectionSchemas;
export type SectionContent<T extends SectionType> = z.infer<(typeof sectionSchemas)[T]>;
export type Section = { [T in SectionType]: { type: T } & SectionContent<T> }[SectionType];

/** Sections each page has, in default order. The first one is the pinned hero. */
export const PAGE_SECTIONS: Record<PageId, SectionType[]> = {
  home: [
    'home.hero',
    'home.categories',
    'home.trending',
    'home.weekend',
    'home.cities',
    'home.organizers',
    'stats',
    'home.forOrganizers',
    'home.howItWorks',
    'testimonials',
  ],
  about: ['about.hero', 'stats', 'about.values'],
  'become-organizer': ['become.hero', 'stats'],
};

const variants = Object.entries(sectionSchemas).map(([type, s]) => s.extend({ type: z.literal(type) }));
const sectionSchema = z.discriminatedUnion('type', variants as unknown as [(typeof variants)[number]]);
const byType = new Map<string, z.ZodType>(variants.map((v, i) => [Object.keys(sectionSchemas)[i]!, v]));

export function isValidSection(s: unknown): s is Section {
  const t = (s as { type?: unknown } | null)?.type;
  const schema = typeof t === 'string' ? byType.get(t) : undefined;
  return !!schema && schema.safeParse(s).success;
}

/** A full page: exactly the page's section types, each once, hero first. */
export function pageSectionsSchema(page: PageId) {
  const allowed = PAGE_SECTIONS[page];
  return z
    .array(sectionSchema)
    .max(allowed.length)
    .superRefine((list, ctx) => {
      const types = list.map((s) => (s as { type: string }).type);
      if (types.length !== allowed.length || allowed.some((t) => !types.includes(t))) {
        ctx.addIssue({ code: 'custom', message: 'Sections don’t match this page' });
      }
      if (types[0] !== allowed[0]) ctx.addIssue({ code: 'custom', message: 'The hero must stay first' });
      if ((list[0] as { enabled?: boolean } | undefined)?.enabled === false)
        ctx.addIssue({ code: 'custom', message: 'The hero can’t be hidden (it holds the page title)' });
    }) as unknown as z.ZodType<Section[]>;
}

// ---------- edits from the admin editor ----------
/**
 * The editor sends image fields as { path } | null: URLs from the browser are never trusted; the server
 * checks the path and builds the URL (lib/storage/server.ts resolveImage).
 */
export const imageEditSchema = z
  .object({ path: z.string().min(1).max(300) })
  .strict()
  .nullable();

export const pageEditInput = z
  .object({
    page: z.enum(PAGE_IDS),
    sections: z.array(z.record(z.string(), z.unknown())).max(20),
  })
  .strict();
