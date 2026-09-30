# Local setup

## Requirements

- Node.js 22 (`node -v`)
- Java JDK 21+ — required by the Firestore, Storage and Auth emulators (`java -version`).
  macOS (no admin password needed):
  ```bash
  brew install openjdk@21
  echo 'export PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH' >> ~/.zshrc
  ```
- Playwright browser (once): `npx playwright install chromium`

## Install

```bash
npm install
npm --prefix functions install
cp .env.example .env.local   # already points at the emulators
```

## Run locally

```bash
npm run dev:all
```

One command: puts Java 21 on the PATH if needed (Homebrew `openjdk@21`), builds the Cloud Functions,
starts the Emulator Suite (Auth 9099 · Firestore 8080 · Functions 5001 · Storage 9199 · UI 4000; data kept in
`.emulator-data/`), seeds demo data on the first run, and starts Next.js on http://localhost:3000
(or reuses one that is already running). Ctrl+C stops everything and saves emulator data.

Prefer two terminals? `npm run emulators` (same steps without Next.js), then `npm run dev`.
Re-seed any time with `npm run seed`.

The app needs the emulators: every page resolves its marketplace from Firestore. Without them you get a
503 "Cannot reach Firestore" after 5 s.

In development the login page shows **one-click demo accounts** (admin, organizer, attendee, applicant).
They only render when the app talks to the local emulators, never in production.

### Seeded marketplaces and accounts (emulator only)

| URL | Marketplace |
|---|---|
| http://localhost:3000, http://demo.localhost:3000 | `demo` ("TicketExpert": seeded logo, event photos, sample order) |
| http://other.localhost:3000 | `other` ("Othertix", teal) — used to check tenant isolation |
| any other host | "Marketplace not found" (404) |

Accounts: `admin@demo.test` (tenant_admin), `organizer@demo.test` (Pulse Live, 6 sample events), `scanner@demo.test`
(staff for the first two events; log in at `/scanner/login`),
`attendee@demo.test`, `buyer@demo.test` (used by the purchase E2E test), `applicant@demo.test` (pending organizer application "Clay Collective"),
`admin@other.test`, `attendee@other.test`. The shared test password is `SEED_PASSWORD` in
`scripts/seed-credentials.ts`. Google sign-in works through the emulator's fake account picker.
Password-reset emails are not sent; the link is printed in the emulator log.

Check-in: the seed creates a paid order for "Neon Tides Live" with tickets `seedticket0001`, `seedticket0002` (valid) and
`seedticket0003` (already checked in). On a laptop without a camera, use **Enter ticket ID** on the scan screen. The camera
needs `localhost` or HTTPS; to try it on a phone, open the dev server through an HTTPS tunnel.

## Checks

| Command | What it does |
|---|---|
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit tests (Vitest), incl. pure Cloud Functions logic |
| `npm run test:rules` | Security-rules tests (starts Firestore + Storage emulators) |
| `npm run test:integration` | Blocking function + callables against Auth/Functions/Firestore emulators (seeds them) |
| `npm run test:e2e` | Playwright at 1280px and 375px (starts + seeds emulators incl. Storage; reuses a running `npm run dev`) |

`test:integration` and `test:e2e` start their own emulators: stop `npm run emulators` first (ports clash).

The project id is `demo-ticketing`. The `demo-` prefix makes the emulators refuse to talk to any real
Firebase project, and the seed script refuses to run against anything else.

## Dev-only pages

- `/dev/style-guide` — every design-system component (mirrors `design/01 Style Guide.dc.html`). 404 in production.

## Production setup checklist (Phase 2 items; full deployment docs in Phase 7)

1. **Blaze plan + Identity Platform**: upgrade Firebase Authentication to Identity Platform and enable
   multi-tenancy (required for per-marketplace user pools and blocking functions).
2. **Per marketplace**: create an Identity Platform tenant (email/password + Google enabled; add the
   marketplace's domains to Google's authorized domains), then write `tenants/{id}` with its `authTenantId`
   and one `tenantDomains/{hostname}` doc per hostname. Done with the Admin SDK — never from a client.
3. **Blocking function**: after deploying, register `onBeforeUserCreated` under
   Authentication → Settings → Blocking functions (beforeCreate).
4. **App Check**: create a reCAPTCHA Enterprise key listing every marketplace domain, set
   `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`, register the app, then enforce App Check for Firestore,
   Storage and Cloud Functions in the console. Callables already set `enforceAppCheck` outside the emulator.
5. **TTL policy** on `rateLimits.expiresAt` (Firestore → TTL) so old counters are deleted.
7. **Indexes & custom tokens**: deploy `firestore.indexes.json`; the server's service account needs
   *Service Account Token Creator* so `createCustomToken` (image uploads, admin actions) can sign tokens.
6. **Client IP**: rate limiting trusts the last `X-Forwarded-For` hop. Confirm this matches the hosting
   provider's proxy chain before launch (Phase 7).

## Secrets

None yet. From Phase 4, payment keys, webhook secrets, the QR signing secret and the email API key live in
Google Secret Manager and are read only by Cloud Functions. Never put them in `.env*` files the Next.js client
can read, and never in `NEXT_PUBLIC_*` variables.

## Payments locally

The demo marketplace uses the **test payment provider**: "Continue to payment" opens a local page with
"Pay (test)" / "Simulate a declined payment", which sends a signed webhook to the app — the same path Stripe uses.
Emails are not sent; they appear in the Emulator UI under Firestore → `devEmails`.

Secrets for local use are random values in `.env.local` (`QR_SIGNING_SECRET`, `TEST_PAYMENT_WEBHOOK_SECRET`) and
`functions/.secret.local` (`QR_SIGNING_SECRET` must match, `RESEND_API_KEY=dev`). Both files are gitignored.

### Trying real Stripe (test mode)
1. Create a Stripe account with Connect enabled; put the **test** keys in `.env.local`:
   `STRIPE_SECRET_KEY=sk_test_…`, and run `stripe listen --forward-connect-to localhost:3000/api/webhooks/stripe`
   to get `STRIPE_WEBHOOK_SECRET=whsec_…`.
2. Admin → Settings → Payments → **Connect Stripe**, finish onboarding with Stripe's test data.
3. Buy a ticket and pay with card `4242 4242 4242 4242`.

### Production (Phase 7 deployment docs will expand this)
- Secret Manager: `QR_SIGNING_SECRET` (same value for the web app and Functions), `RESEND_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; Functions param `EMAIL_FROM` (verified sender domain).
- Stripe: a **Connect** webhook endpoint → `https://<platform domain>/api/webhooks/stripe` with events
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`,
  `checkout.session.async_payment_failed`.
- The test provider refuses to run when `NODE_ENV=production`.

