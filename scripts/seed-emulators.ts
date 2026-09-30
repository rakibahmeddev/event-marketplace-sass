/**
 * Seeds the local Firebase Emulator Suite. Refuses to run against anything but the emulators.
 *   npm run seed            (emulators must be running: npm run emulators)
 *
 * Creates two marketplaces with separate Identity Platform user pools:
 *   demo  → http://localhost:3000, http://demo.localhost:3000
 *   other → http://other.localhost:3000   (used to prove tenant isolation)
 * and one account per role. TEST CREDENTIALS ONLY — see scripts/seed-credentials.ts.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { searchWords } from '../lib/format/text.ts';
import { zonedToUtc } from '../lib/format/time.ts';
import { SEED_PASSWORD } from './seed-credentials.ts';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-ticketing';
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing to seed project "${projectId}": only demo-* (emulator) projects are allowed.`);
}

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.appspot.com`;
initializeApp({ projectId, storageBucket });
const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

/**
 * Uploads a file from scripts/seed-assets to the Storage emulator and returns the { path, url } ref the app
 * stores (same tokenised URL format as lib/storage/server.ts). Photos: Unsplash License, see docs/image-credits.md.
 */
async function uploadAsset(file: string, path: string): Promise<{ path: string; url: string }> {
  const token = randomUUID();
  await bucket.file(path).save(readFileSync(new URL(`./seed-assets/${file}`, import.meta.url)), {
    contentType: 'image/webp',
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  return {
    path,
    url: `http://${host}/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
  };
}

type TenantSeed = {
  id: string;
  name: string;
  domains: string[];
  primaryColor: string;
  accentColor: string;
  /** File in scripts/seed-assets uploaded as branding.logo. */
  logo?: string;
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
    image: 'event-neon-tides.webp',
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
    image: 'event-rooftop-jazz.webp',
    cat: 'music-concerts',
    days: 5,
    time: '18:00',
    hours: 3,
    venue: ['Skyline Terrace', '1 Sunset Blvd', 'Los Angeles'],
    tickets: [['General Admission', 3500, 250, 60]],
  },
  {
    title: 'Intro to Ceramics: Wheel Throwing',
    image: 'event-ceramics.webp',
    cat: 'workshops',
    days: 4,
    time: '10:00',
    hours: 3,
    venue: ['Clay Collective', '44 Pottery Ln', 'Austin'],
    tickets: [['Workshop seat', 6500, 12, 10]],
  },
  {
    title: 'Open Studios: Contemporary Print Fair',
    image: 'event-print-fair.webp',
    cat: 'arts-and-culture',
    days: 5,
    time: '11:00',
    hours: 6,
    venue: ['Mill Street Gallery', '9 Mill St', 'Seattle'],
    tickets: [['Free entry', 0, 500, 12]],
  },
  {
    title: 'Stand-Up Saturdays with Priya Rao',
    image: 'event-stand-up.webp',
    cat: 'comedy',
    days: 11,
    time: '19:30',
    hours: 2,
    venue: ['The Laugh Cellar', '12 Congress Ave', 'Austin'],
    tickets: [['General', 1800, 120, 0]],
  },
  {
    title: 'UX Writing Masterclass (Online)',
    image: 'event-ux-writing.webp',
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
    name: 'TicketExpert',
    logo: 'ticketexpert-logo.webp',
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
      { email: 'buyer@demo.test', name: 'Priya Shah', role: 'attendee' },
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
    paymentConfig: { provider: 'test', chargesEnabled: false },
    branding: {
      name: t.name,
      primaryColor: t.primaryColor,
      accentColor: t.accentColor,
      logo: t.logo ? await uploadAsset(t.logo, `tenants/${t.id}/branding/logo.webp`) : null,
    },
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
  let organizerId: string | undefined; // the organizer is listed before the scanner and attendees
  let attendeeUid: string | undefined;
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
      organizerId = `org-${user.uid.slice(0, 8)}`;
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
    if (u.role === 'scanner' && organizerId) {
      // Staff of Pulse Live, assigned to the first two sample events (what createScanner would write).
      claims.organizerId = organizerId;
      await db.doc(`tenants/${t.id}/scannerAssignments/${user.uid}`).set({
        eventIds: ['seed0000000001', 'seed0000000002'],
        organizerId,
        name: u.name,
        email: u.email,
        active: true,
        scanCount: 0,
        lastScanAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (u.email.startsWith('attendee@')) attendeeUid = user.uid;
    await tenantAuth.setCustomUserClaims(user.uid, claims);
    await db.doc(`users/${user.uid}`).set({
      tenantId: t.id,
      displayName: u.name,
      email: u.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  if (organizerId && attendeeUid) await seedSampleOrder(t.id, organizerId, attendeeUid);
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
    const cover = await uploadAsset(
      e.image,
      `tenants/${tenantId}/organizers/${organizerId}/events/${id}/cover.webp`,
    );
    await db.doc(`tenants/${tenantId}/events/${id}`).set({
      organizerId,
      title: e.title,
      slug,
      category: e.cat,
      description:
        'Expect a great night out with friends and strangers alike.\n\nDoors open 30 minutes before the start. Bring a valid photo ID.',
      images: [cover],
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

/**
 * One paid order for the first sample event with fixed ticket ids, so the scanner, attendee list and
 * My tickets have real data: seedticket0001/0002 valid, seedticket0003 already checked in.
 */
async function seedSampleOrder(tenantId: string, organizerId: string, buyerUid: string) {
  const eventId = 'seed0000000001';
  const price = 4500;
  const fee = Math.round(price * 0.035);
  const people = [
    { name: 'Jordan Lee', email: 'attendee@demo.test' },
    { name: 'Sam Ortiz', email: 'sam.ortiz@example.com' },
    { name: 'Avery Kim', email: 'avery.kim@example.com' },
  ];
  const now = new Date();
  await db.doc(`tenants/${tenantId}/orders/seedorder0001`).set({
    buyerUid,
    buyerName: 'Jordan Lee',
    buyerEmail: 'attendee@demo.test',
    eventId,
    organizerId,
    items: [{ ticketTypeId: 'tt2', name: 'General Admission', unitPrice: price, quantity: people.length }],
    attendees: people,
    subtotal: price * people.length,
    fees: fee * people.length,
    commission: fee * people.length,
    total: (price + fee) * people.length,
    currency: 'USD',
    status: 'paid',
    provider: 'test',
    paymentRef: 'seed',
    expiresAt: null,
    createdAt: now,
    paidAt: now,
  });
  for (const [i, p] of people.entries()) {
    const used = i === 2;
    await db.doc(`tenants/${tenantId}/tickets/seedticket000${i + 1}`).set({
      orderId: 'seedorder0001',
      eventId,
      ticketTypeId: 'tt2',
      ticketTypeName: 'General Admission',
      attendeeName: p.name,
      attendeeEmail: p.email,
      status: used ? 'used' : 'valid',
      checkedInAt: used ? now : null,
      checkedInBy: used ? 'seed' : null,
    });
  }
  await db
    .doc(`tenants/${tenantId}/eventStats/${eventId}`)
    .set({ ticketsIssued: people.length, checkedIn: 1 });
}

for (const t of tenants) await seedTenant(t);
console.log(`\nAll seeded accounts use SEED_PASSWORD from scripts/seed-credentials.ts.`);
