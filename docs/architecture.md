# Architecture

> Keep this file updated whenever structure or data flow changes (CLAUDE.md → How to work).

## Status

- Phase 1 complete: project setup, design tokens, component library, layouts, emulators.
- Phase 2 complete: tenant resolution, Identity Platform multi-tenant auth, session cookies,
  custom claims, route guards, Firestore rules + tests, rate limiting.
- Phase 3 complete: categories, organizer applications + approval, event create/edit/publish with
  ticket types and image uploads, public home / browse / event / organizer pages, about, contact.
- Checkout, tickets, scanner and dashboard statistics are still stubs (Phases 4–6).

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

Composite indexes for every browse filter live in `firestore.indexes.json` (Firestore merges them for
combined filters). The emulator does not enforce indexes, so they are verified on the first deploy (Phase 7).

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
  `/admin`: tenant_admin · `/scanner`: scanner or organizer.
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
| `tenants/{t}/**` (events, ticketTypes, organizers, categories, …) | none (server-rendered) | none (server actions / Functions) |
| `users/{uid}` | owner, same tenant | owner may change `displayName` only (string ≤ 80) |
| `tenantDomains/*`, `rateLimits/*`, anything else | none | none |

## Tests

- `tests/rules` — 84 tests, incl. every role × every tenant-B path (tenant isolation) and claim spoofing.
- `tests/integration` — 10 tests against Auth + Functions + Firestore emulators (blocking function, `setUserRole`).
- `tests/e2e` — Playwright at 1280 and 375: layouts, guards, login/logout/register, roles, cross-tenant sessions, Google (desktop).
- Unit tests (Vitest) for pure logic: host parsing, redirects, schemas, role decisions, error messages.
