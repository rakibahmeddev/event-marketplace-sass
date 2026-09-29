# Architecture

> Keep this file updated whenever structure or data flow changes (CLAUDE.md → How to work).

## Status

- Phase 1 complete: project setup, design tokens, component library, layouts, emulators.
- Phase 2 complete: tenant resolution, Identity Platform multi-tenant auth, session cookies,
  custom claims, route guards, Firestore rules + tests, rate limiting.
- Feature pages (events, checkout, tickets, dashboards) are still stubs.

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
functions/              Cloud Functions 2nd gen (TypeScript, Node 22): beforeUserCreated, setUserRole, health
firestore.rules         deny by default; tenants, auditLogs, users opened per role
storage.rules           deny-all (opened in Phase 3)
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
- Firestore rules: see below. Storage rules still deny everything (opened in Phase 3).
- Emulator project id `demo-ticketing` cannot reach production.

## Data model additions (approved in Phase 2)

| Path / field | Purpose | Access |
|---|---|---|
| `tenants/{tenantId}.authTenantId` | Identity Platform tenant (user pool) of this marketplace | server only |
| `tenantDomains/{hostname}` → `{ tenantId }` | hostname → tenant lookup; one doc per hostname keeps domains unique | server only |
| `rateLimits/{sha256(key, window)}` → `{ count, expiresAt }` | fixed-window counters; `expiresAt` for a Firestore TTL policy | server only |

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
| `tenants/{t}/**` (everything else) | none yet (Phase 3+) | none yet |
| `users/{uid}` | owner, same tenant | owner may change `displayName` only (string ≤ 80) |
| `tenantDomains/*`, `rateLimits/*`, anything else | none | none |

## Tests

- `tests/rules` — 84 tests, incl. every role × every tenant-B path (tenant isolation) and claim spoofing.
- `tests/integration` — 10 tests against Auth + Functions + Firestore emulators (blocking function, `setUserRole`).
- `tests/e2e` — Playwright at 1280 and 375: layouts, guards, login/logout/register, roles, cross-tenant sessions, Google (desktop).
- Unit tests (Vitest) for pure logic: host parsing, redirects, schemas, role decisions, error messages.
