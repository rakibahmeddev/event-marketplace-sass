/**
 * Seeds the local Firebase Emulator Suite. Refuses to run against anything but the emulators.
 *   npm run seed            (emulators must be running: npm run emulators)
 *
 * Creates two marketplaces with separate Identity Platform user pools:
 *   demo  → http://localhost:3000, http://demo.localhost:3000
 *   other → http://other.localhost:3000   (used to prove tenant isolation)
 * and one account per role. TEST CREDENTIALS ONLY — see scripts/seed-credentials.ts.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { searchWords } from '../lib/format/text.ts';
import { zonedToUtc } from '../lib/format/time.ts';
import { SEED_PASSWORD } from './seed-credentials.ts';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-ticketing';
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing to seed project "${projectId}": only demo-* (emulator) projects are allowed.`);
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

type TenantSeed = {
  id: string;
  name: string;
  domains: string[];
  primaryColor: string;
  accentColor: string;
  users: { email: string; name: string; role: 'tenant_admin' | 'organizer' | 'scanner' | 'attendee' }[];
  /** A pending organizer application (attendee account) for trying the approval flow. */
  applicant?: { email: string; name: string; org: string; slug: string };
};

const TZ = 'America/New_York';
const CATEGORIES = [
  ['Music Concerts', 'music'],
  ['Sports Events', 'sports'],
  ['Workshops', 'workshop'],
  ['Festivals', 'festival'],
  ['Conferences', 'conference'],
  ['Nightlife', 'nightlife'],
  ['Comedy', 'comedy'],
  ['Arts & Culture', 'arts'],
] as const;

/** Sample events (from design/data.js), dated relative to today so they stay upcoming. */
const SAMPLE_EVENTS = [
  {
    title: 'Neon Tides Live — Summer Tour Finale',
    cat: 'music-concerts',
    days: 4,
    time: '20:00',
    hours: 3.5,
    venue: ['Harbor Hall', '210 Kent Ave', 'Brooklyn'],
    tickets: [
      ['Early Bird', 3500, 200, 200],
      ['General Admission', 4500, 900, 700],
      ['VIP Balcony', 12000, 100, 84],
    ],
  },
  {
    title: 'Sunset Rooftop Jazz Sessions',
    cat: 'music-concerts',
    days: 5,
    time: '18:00',
    hours: 3,
    venue: ['Skyline Terrace', '1 Sunset Blvd', 'Los Angeles'],
    tickets: [['General Admission', 3500, 250, 60]],
  },
  {
    title: 'Intro to Ceramics: Wheel Throwing',
    cat: 'workshops',
    days: 4,
    time: '10:00',
    hours: 3,
    venue: ['Clay Collective', '44 Pottery Ln', 'Austin'],
    tickets: [['Workshop seat', 6500, 12, 10]],
  },
  {
    title: 'Open Studios: Contemporary Print Fair',
    cat: 'arts-and-culture',
    days: 5,
    time: '11:00',
    hours: 6,
    venue: ['Mill Street Gallery', '9 Mill St', 'Seattle'],
    tickets: [['Free entry', 0, 500, 12]],
  },
  {
    title: 'Stand-Up Saturdays with Priya Rao',
    cat: 'comedy',
    days: 11,
    time: '19:30',
    hours: 2,
    venue: ['The Laugh Cellar', '12 Congress Ave', 'Austin'],
    tickets: [['General', 1800, 120, 0]],
  },
  {
    title: 'UX Writing Masterclass (Online)',
    cat: 'workshops',
    days: 15,
    time: '18:00',
    hours: 2,
    venue: null,
    tickets: [['Live seat', 4000, 300, 25]],
  },
] as const;

const tenants: TenantSeed[] = [
  {
    id: 'demo',
    name: 'brandname',
    domains: ['localhost', '127.0.0.1', 'demo.localhost'],
    primaryColor: '#5B2EE0',
    accentColor: '#FF6B4A',
    applicant: {
      email: 'applicant@demo.test',
      name: 'Marcus Bell',
      org: 'Clay Collective',
      slug: 'clay-collective',
    },
    users: [
      { email: 'admin@demo.test', name: 'Dana Admin', role: 'tenant_admin' },
      { email: 'organizer@demo.test', name: 'Marcus Bell', role: 'organizer' },
      { email: 'scanner@demo.test', name: 'Tasha Green', role: 'scanner' },
      { email: 'attendee@demo.test', name: 'Jordan Lee', role: 'attendee' },
    ],
  },
  {
    id: 'other',
    name: 'Othertix',
    domains: ['other.localhost'],
    primaryColor: '#0F766E',
    accentColor: '#F59E0B',
    users: [
      { email: 'admin@other.test', name: 'Olive Admin', role: 'tenant_admin' },
      { email: 'attendee@other.test', name: 'Omar Haddad', role: 'attendee' },
    ],
  },
];

async function authTenantFor(displayName: string): Promise<string> {
  const { tenants: existing } = await auth.tenantManager().listTenants();
  const found = existing.find((t) => t.displayName === displayName);
  if (found) return found.tenantId;
  const created = await auth.tenantManager().createTenant({
    displayName,
    emailSignInConfig: { enabled: true, passwordRequired: true },
  });
  return created.tenantId;
}

async function seedTenant(t: TenantSeed) {
  const authTenantId = await authTenantFor(`${t.id}-pool`);
  await db.doc(`tenants/${t.id}`).set({
    name: t.name,
    status: 'active',
    authTenantId,
    domains: t.domains,
    timezone: TZ,
    currency: 'USD',
    supportEmail: `help@${t.id}.test`,
    footerTagline:
      'The marketplace for live experiences. Discover events near you, or sell tickets to your own.',
    socialLinks: { instagram: 'https://instagram.com/example', x: 'https://x.com/example' },
    commissionRate: 0.035,
    paymentConfig: {},
    branding: { name: t.name, primaryColor: t.primaryColor, accentColor: t.accentColor, logo: null },
  });
  for (const host of t.domains) await db.doc(`tenantDomains/${host}`).set({ tenantId: t.id });

  for (const [i, [name, icon]] of CATEGORIES.entries()) {
    const slug = name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-');
    await db.doc(`tenants/${t.id}/categories/${slug}`).set({ name, slug, icon, order: i + 1, active: true });
  }

  const tenantAuth = auth.tenantManager().authForTenant(authTenantId);
  for (const u of t.users) {
    const existing = await tenantAuth.getUserByEmail(u.email).catch(() => null);
    const user =
      existing ??
      (await tenantAuth.createUser({
        email: u.email,
        password: SEED_PASSWORD,
        displayName: u.name,
        emailVerified: true,
      }));
    const claims: Record<string, string> = { role: u.role, tenantId: t.id };
    if (u.role === 'organizer') {
      const organizerId = `org-${user.uid.slice(0, 8)}`;
      claims.organizerId = organizerId;
      await db.doc(`tenants/${t.id}/organizers/${organizerId}`).set({
        name: 'Pulse Live',
        slug: 'pulse-live',
        logo: null,
        bio: 'Independent promoter bringing indie, electronic and jazz acts to Brooklyn’s best rooms since 2019. We care about fair prices, good sound and getting you through the door fast.',
        status: 'approved',
        ownerUid: user.uid,
        category: 'music-concerts',
        city: 'Brooklyn, NY',
        createdAt: FieldValue.serverTimestamp(),
        approvedAt: FieldValue.serverTimestamp(),
      });
      await seedEvents(t.id, organizerId);
    }
    if (u.role === 'scanner') {
      await db.doc(`tenants/${t.id}/scannerAssignments/${user.uid}`).set({ eventIds: [], organizerId: null });
    }
    await tenantAuth.setCustomUserClaims(user.uid, claims);
    await db.doc(`users/${user.uid}`).set({
      tenantId: t.id,
      displayName: u.name,
      email: u.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  if (t.applicant) {
    const a = t.applicant;
    const existing = await tenantAuth.getUserByEmail(a.email).catch(() => null);
    const user =
      existing ??
      (await tenantAuth.createUser({
        email: a.email,
        password: SEED_PASSWORD,
        displayName: a.name,
        emailVerified: true,
      }));
    await tenantAuth.setCustomUserClaims(user.uid, { role: 'attendee', tenantId: t.id });
    await db
      .doc(`users/${user.uid}`)
      .set({ tenantId: t.id, displayName: a.name, email: a.email, createdAt: FieldValue.serverTimestamp() });
    await db.doc(`tenants/${t.id}/organizers/app-${user.uid.slice(0, 8)}`).set({
      name: a.org,
      slug: a.slug,
      logo: null,
      bio: 'Hands-on craft workshops for beginners.',
      status: 'pending',
      ownerUid: user.uid,
      category: 'workshops',
      city: 'Austin, TX',
      createdAt: FieldValue.serverTimestamp(),
      approvedAt: null,
    });
  }
  console.log(`✓ ${t.id}: pool ${authTenantId}, ${t.users.length} users, domains ${t.domains.join(', ')}`);
}

async function seedEvents(tenantId: string, organizerId: string) {
  const today = new Date();
  for (const [i, e] of SAMPLE_EVENTS.entries()) {
    const day = new Date(today.getTime() + e.days * 86_400_000).toISOString().slice(0, 10);
    const startAt = zonedToUtc(day, e.time, TZ)!;
    const endAt = new Date(startAt.getTime() + e.hours * 3_600_000);
    const id = `seed${String(i + 1).padStart(10, '0')}`;
    const slug = `${e.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)}-${id.slice(0, 6)}`;
    const city = e.venue ? e.venue[2] : '';
    const prices = e.tickets.map((tt) => tt[1]);
    const minPrice = Math.min(...prices);
    await db.doc(`tenants/${tenantId}/events/${id}`).set({
      organizerId,
      title: e.title,
      slug,
      category: e.cat,
      description:
        'Expect a great night out with friends and strangers alike.\n\nDoors open 30 minutes before the start. Bring a valid photo ID.',
      images: [],
      venue: e.venue
        ? { name: e.venue[0], address: e.venue[1], city, country: 'US' }
        : { name: '', address: '', city: '', country: '' },
      isOnline: !e.venue,
      timezone: TZ,
      refundPolicy: 'Full refunds up to 7 days before the event. Booking fees are non-refundable.',
      startAt,
      endAt,
      status: 'published',
      publishedAt: FieldValue.serverTimestamp(),
      organizerName: 'Pulse Live',
      organizerSlug: 'pulse-live',
      city,
      currency: 'USD',
      minPrice,
      isFree: minPrice === 0,
      totalQuantity: e.tickets.reduce((n, tt) => n + tt[2], 0),
      totalSold: e.tickets.reduce((n, tt) => n + tt[3], 0),
      searchWords: searchWords(e.title, 'Pulse Live', city),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const [j, [name, price, quantity, sold]] of e.tickets.entries()) {
      await db.doc(`tenants/${tenantId}/events/${id}/ticketTypes/tt${j + 1}`).set({
        name,
        description: '',
        price,
        currency: 'USD',
        quantity,
        sold,
        reserved: 0,
        salesStartAt: null,
        salesEndAt: null,
        order: j,
      });
    }
  }
}

for (const t of tenants) await seedTenant(t);
console.log(`\nAll seeded accounts use SEED_PASSWORD from scripts/seed-credentials.ts.`);
