# Security review (Phase 7, 2026-10-01)

Scope: the Next.js app (deployed on Vercel), Cloud Functions, Firestore / Storage rules and the deployment
configuration. Each non-negotiable requirement from CLAUDE.md, how it is met, and the evidence.

## Requirements

| # | Requirement | How | Evidence |
|---|---|---|---|
| 1 | Tenant isolation | Rules check `request.auth.token.tenantId == tenantId` on every tenant path; server code takes the tenant from the hostname (proxy) and re-checks the session's `tenantId` claim and Identity Platform pool on every request | `tests/rules/tenant-isolation.test.ts` (every role × every tenant-B path), `lib/auth/session.ts`, cross-tenant session E2E in `tests/e2e/auth.spec.ts` |
| 2 | Deny by default | `firestore.rules` / `storage.rules` end in deny-all; browsers read only `users/{self}` and `eventStats` (assigned scanners / owning organizer) and create images in their own Storage folder | `tests/rules/*` (125 tests), `tests/rules/server-only-tenant.test.ts` |
| 3 | No trusted client writes | Prices, totals, order / ticket status, `sold`, roles, commission, rollups and pages are written only by server actions / route handlers / Functions with the Admin SDK; the client sends ids and quantities, the server reads prices | `lib/orders/reserve.ts`, `lib/orders/fulfil.ts`, rules tests for write denial |
| 4 | Validate everything | Zod `.strict()` on every server action, route handler and callable; ids checked against `^[A-Za-z0-9]{1,40}$` before Firestore paths | table below; `functions/src/**/schema.ts` |
| 5 | Secrets | Secret Manager only. Functions bind them with `defineSecret`; the web app reads them at runtime through `lib/security/secrets.ts` (Vercel → keyless Workload Identity Federation, no service-account key exists). `instrumentation.ts` refuses to start a deployment that has secrets in env vars or secret-looking `NEXT_PUBLIC_*` values; `npm run check:bundle` scans the client build | `lib/env.ts` + tests, `scripts/check-bundle.mjs`, `lib/firebase/gcp-auth.ts` + tests |
| 6 | App Check | Enforced on all callables outside the emulator (`enforceAppCheck`); the site key is mandatory in deployments (`lib/env.ts`); Firestore / Storage enforcement is a console switch (deploy runbook step) | `functions/src/**`, `docs/deploy.md` §8 |
| 7 | Rate limiting | Firestore fixed-window counters (hashed keys, TTL): sign-in sessions per IP, checkout, payment, scanning (120/min), staff creation, every admin / organizer mutation, slug checks per IP. Fails closed (a Firestore error rejects the request) | table below, `lib/security/rateLimit.ts` |
| 8 | Audit log | `role.change`, `organizer.approve/suspend`, `refund`, `checkin`, `settings.change` (settings and page publishes), `scanner.create/update`; append-only, tenant admins read | `functions/src/lib/audit.ts`, integration tests assert entries |
| 9 | Storage rules | Images only (jpeg/png/webp — no SVG), ≤ 5 MB, create-only, path scoped to tenant + organizer / applicant / branding; the server re-checks path prefix, type and size before storing a URL | `storage.rules`, `tests/rules/storage.test.ts`, `lib/storage/server.ts` |
| 10 | Headers | Per-request nonce CSP with `'strict-dynamic'` (no `unsafe-inline` / `unsafe-eval` for scripts in production), HSTS (preload), `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera for the scanner only), no `X-Powered-By`; API routes get `default-src 'none'` | `proxy.ts`, `lib/security/csp.ts` + tests, `tests/e2e/security-headers.spec.ts`; production server checked with `next start` (all 13 scripts on `/` carry the nonce) |
| 11 | Dependencies | Minimal; additions approved per phase. `npm audit --omit=dev`: no high / critical | below |

## Mutation endpoints

| Endpoint | Who | Zod | Rate limit |
|---|---|---|---|
| `POST/DELETE /api/auth/session` | anyone (same origin) | ✓ | 20/min per IP (sign-in) |
| `POST /api/webhooks/{provider}` | payment provider | signature (raw body) + idempotency | — (signature first) |
| `updateTenantSettings`, `savePageDraft`, `publishPage`, `resetPageDraft` | tenant_admin | ✓ | ✓ |
| `createCategory`, `updateCategory`, `setCategoryActive`, `moveCategory` | tenant_admin | ✓ | ✓ (added in Phase 7) |
| `startStripeOnboarding` | tenant_admin | no input | ✓ (added) |
| `applyAsOrganizer`, `checkOrganizerSlug` | attendee / anyone | ✓ | ✓ (slug check per IP: added) |
| `updateOrganizerProfile` | organizer | ✓ | ✓ (added) |
| `saveEvent`, `changeEventStatus` | approved organizer | ✓ (status action now checked at runtime) | ✓ (added for status) |
| `refundOrderAction` | organizer (own) / tenant_admin | ✓ | ✓ |
| `startCheckout`, `submitCheckout`, `cancelCheckout` | buyer | ✓ | ✓ |
| `simulateTestPayment` | buyer, test provider only, refused in production | ✓ (outcome checked) | — |
| `getClientToken` | signed-in user | no input | ✓ |
| Callables `setUserRole`, `approveOrganizer`, `suspendOrganizer`, `createScanner`, `updateScanner`, `checkInTicket` | per role | ✓ strict | ✓ |
| `GET` CSV / PDF / reports routes | owner / organizer / tenant_admin | ids by regex, ranges clamped | — (reads) |

Server actions are also protected by Next.js's built-in Origin check (CSRF); `/api/auth/session` checks Origin itself.

## Fixed in this review

1. `changeEventStatus` trusted its `action` argument's TypeScript type; a crafted request with another value fell
   through to "cancel". Now checked at runtime.
2. Missing rate limits on category actions, Stripe onboarding, organizer profile updates, event status changes
   and the signed-out slug check.
3. CSP allowed `'unsafe-inline'` scripts → per-request nonces + `'strict-dynamic'`.
4. `next/image` accepted any `firebasestorage.googleapis.com` path (anyone's bucket through our optimizer) →
   pinned to our bucket.
5. Client IP on Vercel: uses `x-real-ip`, which Vercel overwrites with the connecting client (no spoofing via
   client-supplied `X-Forwarded-For`).
6. `@grpc/grpc-js` (high, via the Firebase browser SDK's Node build) → pinned to the patched 1.14 line with an
   npm `overrides` entry.
7. Deployments refuse to start when misconfigured (emulator hosts, missing App Check key, secrets in env vars,
   demo project, secret-looking public variables).
8. Tailwind scanned binary folders (images, design exports, build output) → excluded with `@source not`.

## Accepted risks / notes

- **`uuid` < 11.1.1 (moderate)** via `gaxios` (Firebase Admin Storage, firebase-tools): the bug needs a caller to
  pass a `buf` argument to v3/v5/v6; gaxios uses v4 without one. Forcing uuid 11 (ESM-only) into gaxios 6 risks
  breakage. Re-check when firebase-admin moves to gaxios 7.
- **`style-src 'unsafe-inline'`**: React `style` attributes (chart bars, progress) and Next's injected styles need
  it; a style nonce would make browsers ignore it. Script injection remains blocked.
- **Callable tokens**: `checkInTicket` etc. trust Firebase ID tokens for up to an hour after a scanner is turned
  off; the check-in function re-reads `scannerAssignments.active` on every scan, so a disabled scanner is refused
  immediately.
- **Rate limiter cost**: one Firestore transaction per limited call. Fine at MVP volumes; move hot limits to
  memory + Firestore if scanning traffic grows.
- **Preview deployments** must use a separate Firebase project (see `docs/deploy.md` §5); the WIF attribute
  condition only lets the production environment act as the production service account.

## Still to verify on real infrastructure

- Vercel ↔ Google Workload Identity Federation end to end (unit-tested config; needs the real pool / provider).
- Stripe Connect in test mode with real test keys (adapter typechecks; local flow uses the test provider).
- Camera scanning on real phones (iOS Safari, Android Chrome) over HTTPS.
- App Check enforcement in the console once the site key is live.
