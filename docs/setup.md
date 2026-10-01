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

Sales: the seed adds about 45 days of past Pulse Live orders (made-up buyers, a few refunded) so the dashboard and
Admin → Sales reports have data, then runs `npm run backfill:sales` logic to build the rollups. Run
`npm run backfill:sales` yourself if you edit orders by hand in the Emulator UI.

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

## Production

See **[deploy.md](deploy.md)** (Vercel + Firebase runbook) and **[security-review.md](security-review.md)**.

Production build locally (separate build folder, so it doesn't clash with `npm run dev`):

```bash
NEXT_DIST_DIR=.next-prod npx next build && NEXT_DIST_DIR=.next-prod npm run check:bundle
```

## Secrets

Deployed: Google Secret Manager only (Functions via `defineSecret`, the web app via `lib/security/secrets.ts`).
Locally: `.env.local` and `functions/.secret.local` (both gitignored). Never put secrets in `NEXT_PUBLIC_*`.

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

### Production
- Secret Manager: `QR_SIGNING_SECRET` (same value for the web app and Functions), `RESEND_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; Functions param `EMAIL_FROM` (verified sender domain).
- Stripe: a **Connect** webhook endpoint → `https://<platform domain>/api/webhooks/stripe` with events
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`,
  `checkout.session.async_payment_failed`.
- The test provider refuses to run when `NODE_ENV=production`.

