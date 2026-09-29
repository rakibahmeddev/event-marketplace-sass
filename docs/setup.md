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

Two terminals:

```bash
npm run emulators   # builds functions, starts Auth 9099 · Firestore 8080 · Functions 5001 · Storage 9199 · UI 4000
npm run seed        # once per fresh emulator data: marketplaces, domains, one account per role
npm run dev         # Next.js on http://localhost:3000
```

The app needs the emulators: every page resolves its marketplace from Firestore. Without them you get a
503 "Service temporarily unavailable" after 5 s.

### Seeded marketplaces and accounts (emulator only)

| URL | Marketplace |
|---|---|
| http://localhost:3000, http://demo.localhost:3000 | `demo` (default branding) |
| http://other.localhost:3000 | `other` ("Othertix", teal) — used to check tenant isolation |
| any other host | "Marketplace not found" (404) |

Accounts: `admin@demo.test` (tenant_admin), `organizer@demo.test`, `scanner@demo.test`, `attendee@demo.test`,
`admin@other.test`, `attendee@other.test`. The shared test password is `SEED_PASSWORD` in
`scripts/seed-credentials.ts`. Google sign-in works through the emulator's fake account picker.
Password-reset emails are not sent; the link is printed in the emulator log.

## Checks

| Command | What it does |
|---|---|
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit tests (Vitest), incl. pure Cloud Functions logic |
| `npm run test:rules` | Security-rules tests (starts Firestore + Storage emulators) |
| `npm run test:integration` | Blocking function + callables against Auth/Functions/Firestore emulators (seeds them) |
| `npm run test:e2e` | Playwright at 1280px and 375px (starts + seeds emulators; reuses a running `npm run dev`) |

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
6. **Client IP**: rate limiting trusts the last `X-Forwarded-For` hop. Confirm this matches the hosting
   provider's proxy chain before launch (Phase 7).

## Secrets

None yet. From Phase 4, payment keys, webhook secrets, the QR signing secret and the email API key live in
Google Secret Manager and are read only by Cloud Functions. Never put them in `.env*` files the Next.js client
can read, and never in `NEXT_PUBLIC_*` variables.
