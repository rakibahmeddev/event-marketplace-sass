# Architecture

> Keep this file updated whenever structure or data flow changes (CLAUDE.md → How to work).

## Status

- Phase 1 complete: project setup, design tokens, component library, layouts, emulators.
- Phase 2 complete: tenant resolution, Identity Platform multi-tenant auth, session cookies,
  custom claims, route guards, Firestore rules + tests, rate limiting.
- Phase 3 complete: categories, organizer applications + approval, event create/edit/publish with
  ticket types and image uploads, public home / browse / event / organizer pages, about, contact.
- Admin settings (brought forward from Phase 6): name, logo, brand colours with contrast check, support email,
  footer tagline, social links, commission — plus an admin overview with counts.
- Phase 4 complete: checkout with 10-minute holds, payment layer (Stripe Connect + local test provider),
  signed webhooks, QR tickets, PDF tickets, ticket/approval emails, refunds, organizer orders & overview.
- Phase 5 complete: staff scanner (login, event choice, camera + manual entry, result screens, live counter),
  `checkInTicket` / `createScanner` / `updateScanner` functions, organizer Check-in staff and Attendees pages, CSV export.
- Phase 6 complete: daily sales rollups, organizer dashboard (sales chart 7D/30D/90D, deltas vs previous period,
  recent orders), per-event sales on the event page, admin overview sales and `/admin/reports` with CSV export.
- Section editor ("Elementor-lite", 2026-10-01): Admin → Pages edits Home, About and Become an organizer
  (show/hide, reorder, text, photos, stats, testimonials) with draft → preview → publish.

## Repository layout

```
proxy.ts                hostname → tenant (Next 16's name for middleware)
scripts/                emulator seed (+ shared test credentials)
app/                    Next.js App Router
  layout.tsx            fonts, globals.css, tenant brand colours on <html>
  not-found.tsx         designed 404
  (public)/             SiteHeader + SiteFooter: home, events, events/[slug], o/[slug], become-an-organizer, about, contact
  (auth)/               AuthSplitLayout: login, register, forgot-password (signed-in users are redirected home)
  api/auth/session      POST: ID token → session cookie · DELETE: sign out
  api/health            liveness probe (no tenant lookup)
  forbidden/            wrong role · tenant-not-found/: unknown or suspended hostname (404)
  (attendee)/(account)/ SiteHeader + SiteFooter: account/tickets|orders|settings, orders/[orderId]/confirmation
  (attendee)/checkout/  CheckoutHeader (logo · stepper · secure) — no site chrome
  (organizer)/dashboard DashboardShell + organizer nav
  (admin)/admin         DashboardShell + tenant-admin nav (no admin design; reuses organizer shell)
  scanner/              ScannerShell, mobile-first
  dev/style-guide       component showcase (404 in production)
components/
  ui/                   design-system primitives (Button, Field, Badge, Chip, Table, Tabs, Drawer…)
  site/ events/ organizers/ tickets/ dashboard/ checkout/ auth/ scanner/   composed pieces
lib/
  firebase/client.ts    browser SDK (lazy; connects to emulators when NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true)
  firebase/admin.ts     Admin SDK, server-only (+ tenantAuth(authTenantId))
  auth/                 session cookie verification, guards, roles, browser auth actions
  security/             rate limiting, same-origin check
  tenant/branding.ts    Zod schema for tenant branding + CSS-variable mapping
  tenant/               host normalisation, cached tenant repository, getCurrentTenant()
  validation/           Zod schemas (auth forms, session request)
  payments/             PaymentProvider interface + adapters (Phase 4)
  utils/cn.ts
functions/              Cloud Functions 2nd gen: beforeUserCreated, setUserRole, approveOrganizer, suspendOrganizer, health
firestore.rules         deny by default; tenants, auditLogs, users opened per role
storage.rules           create-only image uploads per organizer / applicant folder
tests/rules/            @firebase/rules-unit-testing against the emulators
tests/integration/      Auth + Functions + Firestore emulators (blocking function, callables)
tests/e2e/              Playwright
design/                 source design files (Claude Design export) — reference only, not built
docs/                   architecture.md, setup.md, deferred.md
```

## Design tokens and tenant theming

- Tokens live in `app/globals.css` (Tailwind v4 `@theme`). Source: `design/01 Style Guide.dc.html`.
- Brand colours are CSS variables (`--brand-primary`, `--brand-accent` + hover/tint shades) exposed
  as Tailwind colours `primary`, `primary-hover`, `primary-100`, `primary-50`, `accent`, `accent-hover`, `accent-100`.
- The root layout reads the tenant's branding (`getCurrentTenantBranding`) and writes overrides onto `<html style>`.
  Only the two base colours are stored per tenant; shades are derived with `color-mix()`. The default
  tenant emits no overrides, so it renders the exact hex values from the design.
- Branding colours are validated as 6-digit hex (`tenantBrandingSchema`) before they reach a style attribute.
- Typography utilities: `type-h1` … `type-h6`, `type-body-lg`, `type-body`, `type-small`, `type-caption`
  (desktop sizes from 768px up, mobile sizes below). Headings use Plus Jakarta Sans, body uses Inter,
  both self-hosted via `next/font`.
- Layout: `page-container` (max 1280, side padding 16/24/32). Breakpoints used: `md` 768, `lg` 1024, `xl` 1280.
- Icons: Font Awesome Free (solid/regular/brands) as bundled SVG via `components/ui/Icon`. Its CSS is
  imported into the `base` layer so Tailwind utilities win.

## Security baseline

- `next.config.ts` sets CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy and
  Permissions-Policy (camera allowed for the scanner only). CSP still allows `'unsafe-inline'` scripts;
  Phase 7 moves to nonces.
- Firestore rules: see below. Storage rules: create-only image uploads into the caller's own folder (see above).
- Emulator project id `demo-ticketing` cannot reach production.

## Data model additions (approved in Phase 2)

| Path / field | Purpose | Access |
|---|---|---|
| `tenants/{tenantId}.authTenantId` | Identity Platform tenant (user pool) of this marketplace | server only |
| `tenantDomains/{hostname}` → `{ tenantId }` | hostname → tenant lookup; one doc per hostname keeps domains unique | server only |
| `rateLimits/{sha256(key, window)}` → `{ count, expiresAt }` | fixed-window counters; `expiresAt` for a Firestore TTL policy | server only |

## Data model additions (approved in Phase 3)

| Path / field | Purpose |
|---|---|
| `tenants/{t}.timezone`, `.currency`, `.supportEmail` | date filters/defaults, marketplace currency, contact |
| `tenants/{t}/categories/{slug}` → `{ name, slug, icon, order, active }` | tenant-managed categories; the slug is the id |
| `organizers.category`, `.city`, `.createdAt`, `.approvedAt`; `logo` is `{ path, url } \| null` | application + profile |
| `events.timezone`, `.isOnline`, `.refundPolicy`, `venue { name, address, city, country }`, `images[] { path, url }` | event details |
| `events.organizerName`, `.organizerSlug`, `.city`, `.currency`, `.minPrice`, `.isFree`, `.totalQuantity`, `.totalSold`, `.searchWords[]` | denormalised for cards, filters, badges and keyword search; written only by server code |
| `ticketTypes.description`, `.order` | display |
| `tenants/{t}.branding.logo` `{ path, url } \| null`, `.footerTagline`, `.socialLinks { instagram?, tiktok?, x?, facebook?, youtube? }` | admin settings (approved 2026-09-30) |
| `tenants/{t}.paymentConfig { provider: stripe\|test, stripeAccountId?, chargesEnabled }` | payment provider per tenant (non-secret) |
| `orders.buyerName`, `.buyerEmail`, `.attendees[]`, `.commission`, `.provider`, `.expiresAt`, `.paidAt`, `.checkoutRef`, `.refundRef`, `.refundedAt`; `items[] { ticketTypeId, name, unitPrice, quantity }` | checkout (Phase 4) |
| `tickets.ticketTypeName` | display on tickets without an extra read |
| `processedWebhookEvents/{provider}_{eventId}` | webhook idempotency (server only) |
| `devEmails/{id}` | **emulator only**: emails written instead of sent, visible in the Emulator UI |
| `tenants/{t}/eventStats/{eventId}` → `{ checkedIn, ticketsIssued }` | live check-in counter (Phase 5); written by fulfilment, refunds and `checkInTicket` |
| `scannerAssignments.name`, `.email`, `.active`, `.scanCount`, `.lastScanAt`, `.createdAt` | staff list + turning staff off (Phase 5) |
| `tenants/{t}/salesDaily/{YYYY-MM-DD}` → `{ date, orders, tickets, gross, subtotal, fees, refundedOrders, refundedTickets, refunds, refundedSubtotal, refundedFees }` | marketplace sales per day (Phase 6), server only |
| `tenants/{t}/organizerSalesDaily/{organizerId}_{YYYY-MM-DD}` → same + `organizerId` | per-organizer sales per day (Phase 6), server only; index `organizerId + date` |
| `eventStats` sales fields (same counters, all-time) | per-event totals (Phase 6) |
| `tenants/{t}/pages/{home\|about\|become-organizer}` → `{ draft: Section[], published: Section[], updatedAt, updatedBy, publishedAt }` | section editor, server only |
| `orders.paidAt`, `.refundedAt` | now the server clock at the moment of the transaction (was serverTimestamp), so the rollup day and the order agree |

Composite indexes for every browse filter live in `firestore.indexes.json` (Firestore merges them for
combined filters). The emulator does not enforce indexes, so they are verified on the first deploy (Phase 7).

## Checkout, payments and tickets (Phase 4)

```
event page ─ startCheckout (server action, rate limited)
              └─ transaction: remaining = quantity − sold − reserved ≥ requested → reserved += q,
                 order { status: pending, expiresAt: +10 min, items (server prices), subtotal, fees, total }
checkout page ─ submitCheckout → buyer + attendee details → PaymentProvider.createCheckout → redirect
                 (Stripe hosted Checkout on the tenant's connected account | local test page)
provider ─ POST /api/webhooks/{stripe|test} (skips tenant proxy; raw body; signature verified)
            └─ processWebhook: tenant from signed metadata + must match tenant.paymentConfig
               (Stripe: event.account === tenant's account)
               └─ fulfilOrder (transaction, idempotent via processedWebhookEvents/{provider}_{eventId}):
                  order paid, 1 ticket per seat, sold += q, reserved −= q, event.totalSold += n
                  (late payment after expiry: honoured if seats free, else refunded)
Cloud Function onOrderPaid (pending→paid) → emails QR tickets to the buyer and to attendees with their own email
Cloud Function expireReservations (every minute) → pending past expiresAt → expired, reserved −= q
  (the web app also sweeps one event before each new hold, so the emulator behaves the same)
```

- **Fees**: service fee per paid ticket = `round(price × commissionRate)`, paid by the buyer; it is the marketplace's
  commission (`orders.fees` = `orders.commission`). Organizer earnings = `orders.subtotal`. Free tickets: no fee;
  free orders are confirmed without a provider.
- **Money flow (MVP)**: all payments land in the tenant's Stripe account; organizer payouts happen outside the app.
- **QR**: `ticketId.tenantId.base64url(HMAC-SHA256(QR_SIGNING_SECRET))`, rendered on the server (web: SVG/PNG/PDF,
  Functions: PNG in email). Same algorithm in `lib/tickets/qr-core.ts` and `functions/src/lib/qr.ts`, pinned by an
  openssl test vector. No personal data in the code.
- **Refunds**: organizer (own events) or tenant admin → provider refund (idempotency key per order) → transaction:
  order refunded, tickets cancelled, seats returned, audit log `refund`.
- **Pages**: `/checkout` (cart = active holds), `/checkout/[orderId]`, `/checkout/[orderId]/test-payment` (dev),
  `/orders/[orderId]/confirmation`, `/account/tickets`, `/account/tickets/[ticketId]`, `/account/orders`,
  `/api/orders/[orderId]/pdf` (buyer only), `/dashboard` (overview), `/dashboard/orders` (refunds).
- **Stripe Connect onboarding**: Admin → Settings → Payments → Standard connected account + account link;
  `/api/admin/stripe/return` switches the tenant to Stripe once `charges_enabled`.

## Scanner and check-in (Phase 5)

```
organizer ─ /dashboard/staff ─ createScanner (callable) → staff account in the tenant's pool, claims
             { role: scanner, tenantId, organizerId }, scannerAssignments/{uid}, invitation email (set-password link)
           └ updateScanner → change events / turn off (disables sign-in, revokes refresh tokens)
staff ─ /scanner/login → /scanner (assigned, published events) → /scanner/{eventId}
         camera: BarcodeDetector, else jsQR on canvas frames (lib/scanner/decode.ts); or "Enter ticket ID"
         └ checkInTicket (callable, App Check, 120 scans/min per user)
            1. caller: active scanner assigned to the event, or the organizer owning it
            2. QR signature (constant-time) and tenant; manual entry skips only this step
            3. transaction: valid → used + checkedInAt/By, eventStats.checkedIn += 1,
               assignment scanCount/lastScanAt, audit log `checkin`
            → valid | already_used (first time + who) | invalid (not_a_ticket, other_marketplace,
              not_found, wrong_event, cancelled)
         live counter: onSnapshot(eventStats/{eventId}) with a custom-token Firebase sign-in kept for the page
```

- The client never decides validity; two simultaneous scans of one ticket yield exactly one `valid` (tested).
- Scanner accounts see only `/scanner`: account pages redirect there and checkout refuses them.
- `/dashboard/attendees`: per-event list, status filter, search (name, email, ticket ID), 50 per page.
  `/api/dashboard/events/{eventId}/attendees` exports CSV for the owning organizer; cells starting with
  `= + - @` are prefixed with `'` (CSV injection).

## Sales reports (Phase 6)

```
fulfilOrder transaction ── order paid ─┐
refundOrder transaction ── refunded ───┴→ applyRollup (lib/reports/write.ts), same transaction:
     salesDaily/{day} += counters · organizerSalesDaily/{org}_{day} += counters · eventStats/{event} += counters
     day = dayKey(paidAt | refundedAt, tenant.timezone)   (sale on the paid day, refund on the refund day)
pages ── lib/reports/repository.ts (range queries by date) → summarize.ts (fill empty days, totals, net, % change)
```

- Idempotent by construction: rollups are written inside the transactions that already dedupe webhooks
  (`processedWebhookEvents`) and refunds (status check), so a replayed webhook never counts twice (tested).
- Net = sales − refunds in the same period. Organizer earnings = `subtotal` (ticket prices); marketplace commission
  = `fees` (service fees). Gross = what buyers paid (`total`).
- `scripts/backfill-sales.ts` (`npm run backfill:sales`) rebuilds all rollups and eventStats counters from orders and
  tickets; the seed uses it, and an integration test checks it reproduces the live counters exactly.
- Pages: `/dashboard` (organizer, `?range=7d|30d|90d`), `/dashboard/events/{id}` (all-time event totals),
  `/admin` (last 30 days), `/admin/reports` (`?range=7d|30d|90d|month|last-month|custom&from&to`, max 366 days),
  `/api/admin/reports?…&kind=daily|organizers` (CSV, tenant_admin only, formula-escaped).
- Charts: `components/reports/SalesChart.tsx`, HTML/CSS bars rendered on the server (no chart library), with an
  equivalent screen-reader table.

## Section editor (Admin → Pages)

```
/admin/pages/{page} (PageEditor, client) ── savePageDraft / publishPage / resetPageDraft (server actions, tenant_admin)
   payload: sections with images as { path } only → resolveImage(path, tenants/{t}/branding/) builds the URL
   → pageSectionsSchema(page): exactly this page's section types, once each, hero first and visible,
     Zod .strict() per type (lib/pages/schema.ts), text length limits, links = site path | #anchor | https://
   → tenants/{t}/pages/{page}.draft  (+ .published and audit log `settings.change` on publish)
public page ── getPublicSections(): published, or the draft with ?preview=1 for this tenant's admins only
            └─ normalizePage(): drops unknown/duplicate sections, appends new section types from defaults,
               repairs invalid ones → components/sections/* render plain text ({marketplace} → tenant name)
```

- Built-in content lives in `lib/pages/defaults.ts` (what every marketplace shows until it publishes). Stats and
  testimonials start hidden with placeholder text, so nothing made-up goes live.
- Fixed by design: which sections exist per page, icons (by position), list sizes (3 steps / perks / values;
  1–4 figures; 1–6 quotes), and the functional blocks (event lists, search, pricing, sign-up form).
- No HTML is stored or rendered; React escapes all section text.

## Admin settings

`/admin/settings` → `updateTenantSettings` server action (tenant_admin, Zod strict, rate limit). Colours must pass
WCAG AA (white text on primary, ink text on accent, 4.5:1). Social links must be `https://`. Currency, timezone,
status and the Identity Platform tenant are not editable. Each save writes a `settings.change` audit entry listing the
changed fields, clears this server's tenant cache and revalidates all pages (other instances refresh within 60 s).
Logos upload to `tenants/{t}/branding/` (Storage rules: tenant_admin of that tenant, images ≤ 5 MB, create-only).
`TenantLogo` renders the uploaded logo everywhere the mark appears.

## Organizers and events (Phase 3)

- **Reads**: public pages and dashboards are Server Components reading with the Admin SDK
  (`lib/*/repository.ts`, Zod-validated). Firestore rules keep events, ticket types, organizers and
  categories closed to browsers.
- **Writes**: Next.js server actions (`lib/events/actions.ts`, `lib/organizers/actions.ts`,
  `lib/categories/actions.ts`) — session + role + ownership checks, Zod (unknown fields rejected), rate limits.
  `saveEvent` computes every server-owned field (status, slug, totals, minPrice, searchWords…) in a transaction;
  ticket prices are locked once sold, quantities can't drop below sold + reserved, types with sales can't be deleted.
- **Publishing** requires title + category, cover image, future start < end, venue (unless online) and ≥ 1 ticket type.
  Published events can be unpublished only before any sale; otherwise cancelled.
- **Organizer applications**: `applyAsOrganizer` creates a `pending` organizer (slug uniqueness checked in a
  transaction). The tenant admin approves or suspends via the `approveOrganizer` / `suspendOrganizer` callables
  (claims + token revocation + audit log; suspension unpublishes the organizer's events).
- **Images**: the browser gets a short-lived custom token (`getClientToken` server action → `signInWithCustomToken`),
  uploads into its own folder (Storage rules: images only, ≤ 5 MB, create-only, no reads/listing), then signs out.
  On save the server verifies path prefix, existence, type and size, and builds the tokenised download URL itself.
- **Browse**: URL params → Zod → repository filters (`lib/events/browse.ts`); date ranges use the marketplace
  timezone; keyword search = first word via `searchWords` array-contains, other words filtered on the page.

## Tenant resolution

```
request ─▶ proxy.ts
            ├─ strip client-sent x-tenant-id, set x-pathname
            ├─ normalizeHost(Host)   (lib/tenant/host.ts — rejects anything that isn't a hostname)
            ├─ tenantDomains/{host} ─▶ tenants/{id}   (Admin SDK; cached 60 s prod / 2 s dev; 5 s timeout)
            ├─ unknown or suspended ─▶ rewrite to /tenant-not-found (404)
            ├─ Firestore unreachable ─▶ 503
            └─ ok ─▶ forward with x-tenant-id
server code: getCurrentTenant() reads x-tenant-id (React cache, once per request)
```

Every hostname a tenant uses (custom domain or platform subdomain) is a `tenantDomains` doc.

## Authentication and sessions

- **One user pool per marketplace** (Identity Platform multi-tenancy). The browser sets
  `auth.tenantId = tenant.authTenantId`, so the same email can hold separate accounts on different marketplaces.
- **Sign-up** (email/password or Google) → `beforeUserCreated` blocking function: rejects pools without an
  active marketplace, creates `users/{uid}`, returns claims `{ role: 'attendee', tenantId }` (already in the first ID token).
- **Sign-in** → ID token → `POST /api/auth/session`: same-origin check, rate limit (20/min per client IP),
  Zod (unknown fields rejected), token verified in the host tenant's pool, `tenantId` claim must match,
  sign-in < 5 min old → httpOnly `__session` cookie (5 days; browser-session cookie when "Keep me logged in" is off).
  The browser SDK uses in-memory persistence and signs out right away — no tokens in browser storage.
- **Every request**: `getSessionUser()` verifies the cookie (incl. revocation) in the host tenant's pool and
  re-checks `tenantId`. A cookie from marketplace A is worthless on marketplace B.
- **Guards** (server, in layouts): `requireUser()` → `/login?next=…` (same-site paths only);
  `requireRole(...)` → `/forbidden`. Account + checkout: any user · `/dashboard`: organizer ·
  `/admin`: tenant_admin · `/scanner/*`: scanner or organizer (signed-out → `/scanner/login`).
- **Sign-out**: `DELETE /api/auth/session` clears the cookie and revokes refresh tokens.

## Roles and claims

- Claims `{ role, tenantId, organizerId? }` are set only by Cloud Functions / the Admin SDK.
- `setUserRole` (callable; App Check enforced outside the emulator; rate limited): a tenant_admin moves users of
  their own pool between attendee ↔ organizer (organizer needs an approved `organizers` doc owned by that user).
  It revokes refresh tokens and writes `auditLogs`. The decision logic is pure: `functions/src/auth/roleChange.ts`.
- platform_admin has no client Firestore access; platform work goes through server code.

## Firestore rules

| Path | Read | Write |
|---|---|---|
| `tenants/{t}` | tenant_admin of t | none |
| `tenants/{t}/auditLogs/*` | tenant_admin of t | none (Functions only) |
| `tenants/{t}/eventStats/{eventId}` | active scanner assigned to the event, or its organizer | none |
| `tenants/{t}/salesDaily/*`, `organizerSalesDaily/*`, `pages/*` | none (server-rendered) | none |
| `tenants/{t}/**` (events, ticketTypes, organizers, categories, …) | none (server-rendered) | none (server actions / Functions) |
| `users/{uid}` | owner, same tenant | owner may change `displayName` only (string ≤ 80) |
| `tenantDomains/*`, `rateLimits/*`, anything else | none | none |

## Tests

- `tests/rules` — 125 tests, incl. every role × every tenant-B path (tenant isolation) and claim spoofing.
- `tests/integration` — 33 tests against Auth + Functions + Firestore emulators (blocking function, `setUserRole`,
  organizer approval, orders/webhooks/refunds, check-in incl. concurrent scans, staff management).
- `tests/e2e` — Playwright at 1280 and 375: layouts, guards, login/logout/register, roles, cross-tenant sessions, Google (desktop).
- Unit tests (Vitest) for pure logic: host parsing, redirects, schemas, role decisions, error messages.
