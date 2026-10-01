# Deployment

Production runs entirely on **Firebase / Google Cloud**: the Next.js site on **Firebase App Hosting** (built from
GitHub `main` on every push), plus Identity Platform, Firestore, Storage, Cloud Functions, Secret Manager and
App Check. The site runs as its own Google service account, so there are no keys to create or store.

`npm run setup:prod` does almost everything; the console steps below are the ones Google only offers as clicks.

## First deployment (about 20 minutes)

### 1. Firebase project (console, ~5 min)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → upgrade to **Blaze**.
2. **Authentication** → Get started → Settings → **Upgrade to Identity Platform**.
3. **Firestore** → Create database (Native mode). Pick the location carefully, it can't change later:
   `asia-south1` (Mumbai) for South Asia, `us-central1` for the US.
4. **Storage** → Get started.

### 2. Connect GitHub (console, ~3 min)

**App Hosting** → Get started → connect GitHub → repo `event-marketplace-sass`, branch `main`, root directory `/`
→ pick a region → backend name `web` → create (let it create or link the web app). The first rollout starts; it
will only work after step 3.

### 3. Run the setup (terminal, ~10 min)

```bash
brew install --cask google-cloud-sdk   # once
gcloud auth login                      # once
npx firebase login                     # once
npm install
npm run setup:prod -- --project <your-project-id>
```

It checks billing, the database and the backend, then:

| Step | What it does |
|---|---|
| APIs | turns on Secret Manager, reCAPTCHA Enterprise, App Check, Identity Toolkit, IAM Credentials, Scheduler |
| Rules | deploys Firestore / Storage rules and indexes; TTL for rate-limit counters; daily backups (14 days) |
| Secrets | creates `QR_SIGNING_SECRET` (random), `RESEND_API_KEY` (`dev` = store emails, don't send), `STRIPE_*` (`unset`) |
| App Check | creates a reCAPTCHA Enterprise key for the site's domain and registers the web app (not enforced yet) |
| Access | lets the site read its secrets; lets it sign custom tokens and update image metadata |
| Accounts | turns on multi-tenancy; authorizes the site's domain for sign-in |
| Functions | deploys all Cloud Functions; the sign-up hook is registered with Authentication automatically |
| Marketplace | asks for id, name, timezone, currency, admin email → user pool, marketplace data, domain, admin account |
| Site | starts an App Hosting rollout |

At the end it prints the site URL (`https://web--<project>.<region>.hosted.app`) and a **set-password link** for
the admin. Open it, choose a password, log in → `/admin`.

Re-running is safe: finished steps are skipped.

### 4. Check

- `https://<site>/api/health` → `{"ok":true,"yourIp":"…"}`. `yourIp` must be **your** public IP (search "what is my
  ip"). If it shows a Google address instead, change `TRUSTED_PROXY_HOPS` in `apphosting.yaml` (0 or 2), push.
- Register a normal account, apply as organizer, approve it in `/admin`, publish an event, get a **free** ticket →
  the QR ticket appears in **My tickets** (emails are stored, not sent, until step 5).
- Add door staff, open `/scanner/login` on a phone, scan the ticket.

### 5. Later, when you need them

```bash
npm run setup:prod -- stripe --project <id>                   # payments (test keys first, live later)
npm run setup:prod -- email  --project <id>                   # real emails via Resend
npm run setup:prod -- domain tickets.example.com --project <id>   # your own domain
```

- **stripe** stores the keys, redeploys, and tells you the webhook URL and events to add in Stripe. Then
  `/admin → Settings → Payments → Connect Stripe`. Test card `4242 4242 4242 4242`.
- **email** stores the Resend key, saves the sender in `functions/.env.<project>` (keep that file; it is not
  committed) and redeploys the functions.
- **domain** maps the domain to the marketplace, authorizes it for sign-in and App Check, then tells you to add it
  in App Hosting → Settings → Domains and set the DNS records shown there.

### 6. Turn on App Check enforcement

After everything above works: Firebase console → **App Check** → APIs → **Enforce** for Cloud Firestore, Cloud
Storage and Cloud Functions. Re-test sign-in, a purchase and a scan.

## Everyday

| Change | How it goes live |
|---|---|
| Website code | `git push` to `main` → App Hosting builds and rolls out automatically |
| Cloud Functions | `npx firebase deploy --only functions --project <id>` |
| Rules / indexes | `npx firebase deploy --only firestore:rules,firestore:indexes,storage --project <id>` |
| A secret (e.g. new Stripe key) | `npm run setup:prod -- stripe --project <id>` (or add a version in Secret Manager, then roll out) |

- **Another marketplace:** run `npm run setup:prod -- --project <id>` again and enter a new marketplace id
  (it creates its user pool, data and admin), then `… domain <its-domain> --marketplace <id>`.
- **Logs:** Firebase console → App Hosting → Logs (server errors are one JSON line each); Functions → Logs.
- **Rollback:** App Hosting → Rollouts → roll back to an earlier one. Functions: deploy the previous commit.
- **Restore data:** from the daily backup (`gcloud firestore databases restore`).
- **Sales numbers look wrong** after manual data edits: `gcloud auth application-default login`, then
  `FIREBASE_PROJECT_ID=<id> npm run backfill:sales -- --production`.
- **Dependencies:** `npm audit --omit=dev` monthly; see `docs/security-review.md`.

## What the configuration contains

- `apphosting.yaml`: instance sizes, and which Secret Manager secrets become environment variables (runtime only;
  the App Check site key also at build). No project-specific values — the Firebase web config comes from App
  Hosting (`FIREBASE_WEBAPP_CONFIG` at build → `next.config.ts`, `FIREBASE_CONFIG` at runtime → Admin SDK).
- `instrumentation.ts` + `lib/env.ts`: the deployed server refuses to start if a secret or the App Check key is
  missing, an emulator setting is present, or a public variable looks like a secret.
- Preview environments: use a second Firebase project with its own App Hosting backend (e.g. from a `staging`
  branch) and run the same setup against it.
