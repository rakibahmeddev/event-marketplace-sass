# Deployment runbook

Production setup: **Next.js on Vercel** + **Firebase / Google Cloud** (Identity Platform, Firestore, Storage,
Cloud Functions, Secret Manager, App Check). The web app reaches Google with **Workload Identity Federation**
(Vercel's OIDC token → short-lived Google credentials); no service-account key is created or stored anywhere.

Placeholders: `PROJECT` (Firebase project id), `PROJECT_NUMBER`, `REGION` (e.g. `us-central1`), `TEAM` (Vercel
team slug), `VPROJECT` (Vercel project name), `PLATFORM_DOMAIN` (e.g. `ticketexpert.app`).

> Use two Firebase projects: `PROJECT` for production and `PROJECT-staging` for Vercel preview deployments.
> Repeat §1–§8 for staging with its own values.

## 1. Firebase / Google Cloud project

1. Create the Firebase project, upgrade to **Blaze**.
2. **Authentication → upgrade to Identity Platform**, then enable **multi-tenancy** (Settings → Tenants).
3. Create **Firestore** (Native mode) in `REGION`, and **Storage** (default bucket).
4. Enable APIs: `gcloud services enable iamcredentials.googleapis.com sts.googleapis.com secretmanager.googleapis.com recaptchaenterprise.googleapis.com firebaseappcheck.googleapis.com --project PROJECT`
5. Register a **Web app** in Firebase → note its config (`apiKey`, `authDomain`, `appId`, …).

## 2. Rules, indexes, TTL, backups

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project PROJECT
gcloud firestore fields ttls update expiresAt --collection-group=rateLimits --enable-ttl --project PROJECT
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=14d --project PROJECT
```

Wait until every index in the console shows **Enabled** before going live (browse filters, organizer sales).

## 3. Secrets (Secret Manager)

```bash
openssl rand -base64 48 | tr -d '\n' | gcloud secrets create QR_SIGNING_SECRET --data-file=- --project PROJECT
printf '%s' 'sk_live_…'  | gcloud secrets create STRIPE_SECRET_KEY --data-file=- --project PROJECT
printf '%s' 'whsec_…'    | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=- --project PROJECT   # after §9
printf '%s' 're_…'       | gcloud secrets create RESEND_API_KEY --data-file=- --project PROJECT
```

`QR_SIGNING_SECRET` is shared by the web app (signs QR codes) and Cloud Functions (verifies scans). Rotating it
invalidates every issued QR code — only rotate after an incident, and re-send tickets.

## 4. Service account for the web app

```bash
SA=web-app@PROJECT.iam.gserviceaccount.com
gcloud iam service-accounts create web-app --display-name="Next.js on Vercel" --project PROJECT
for role in roles/datastore.user roles/firebaseauth.admin roles/storage.objectAdmin; do
  gcloud projects add-iam-policy-binding PROJECT --member="serviceAccount:$SA" --role="$role"
done
# Read only the secrets the web app needs:
for s in QR_SIGNING_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET; do
  gcloud secrets add-iam-policy-binding $s --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor --project PROJECT
done
# createCustomToken (uploads, scanner sign-in) signs through the IAM API as itself:
gcloud iam service-accounts add-iam-policy-binding $SA --member="serviceAccount:$SA" --role=roles/iam.serviceAccountTokenCreator --project PROJECT
```

## 5. Workload Identity Federation (Vercel → Google)

1. Vercel → Project **VPROJECT** → Settings → Security → **Secure backend access with OIDC Federation**:
   enable, issuer mode **Team**.
2. Google:

```bash
gcloud iam workload-identity-pools create vercel --location=global --display-name="Vercel" --project PROJECT
gcloud iam workload-identity-pools providers create-oidc vercel --location=global --workload-identity-pool=vercel \
  --issuer-uri="https://oidc.vercel.com/TEAM" --allowed-audiences="https://vercel.com/TEAM" \
  --attribute-mapping="google.subject=assertion.sub,attribute.project=assertion.project,attribute.environment=assertion.environment" \
  --attribute-condition="assertion.owner == 'TEAM' && assertion.project == 'VPROJECT' && assertion.environment == 'production'" \
  --project PROJECT
gcloud iam service-accounts add-iam-policy-binding web-app@PROJECT.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/attribute.project/VPROJECT" \
  --project PROJECT
```

For staging, use `assertion.environment == 'preview'` in the staging project's provider. Production credentials
can then never be used by a preview deployment.

## 6. Vercel project

Import the Git repo (framework: Next.js, root: repo root). **Environment variables** (Production; Preview gets the
staging values):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config (public) |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY` | §8 |
| `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET` | same project / bucket |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/vercel/providers/vercel` |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `web-app@PROJECT.iam.gserviceaccount.com` |
| `SECRET_SOURCE` | `secret-manager` |

**Never** set secrets, emulator hosts, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` or `NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN`
on Vercel: `instrumentation.ts` refuses to start a deployment that has them (`lib/env.ts`).

Function region: set the Vercel project's function region close to `REGION` (Settings → Functions).

## 7. Cloud Functions

```bash
firebase functions:secrets:set QR_SIGNING_SECRET --project PROJECT   # skip if created in §3 (same secret)
firebase deploy --only functions --project PROJECT                    # asks for EMAIL_FROM (e.g. tickets@PLATFORM_DOMAIN)
```

Then **Authentication → Settings → Blocking functions → Before account creation → `onBeforeUserCreated`**.

## 8. App Check

1. reCAPTCHA Enterprise → create a **website key** listing `PLATFORM_DOMAIN`, every marketplace domain and the
   Vercel domain(s); set it as `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`.
2. Firebase → App Check → register the web app with that key.
3. After a deploy works end to end: **Enforce** for Cloud Firestore, Cloud Storage and Cloud Functions.

## 9. Payments (Stripe Connect) and email

- Stripe (live mode) → Developers → Webhooks → **Add endpoint** `https://PLATFORM_DOMAIN/api/webhooks/stripe`,
  "Listen to events on **Connected accounts**", events: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`.
  Put the signing secret in `STRIPE_WEBHOOK_SECRET` (§3).
- Connect settings: set the platform name and branding (onboarding links return to the marketplace that started them).
- Resend: verify the sending domain (SPF/DKIM), use an address on it as `EMAIL_FROM`.

## 10. Add a marketplace (tenant)

Tenants are created by the platform owner (self-signup is out of the MVP).

1. Identity Platform → Tenants → **Add tenant** (email/password + Google) → note the tenant id (`AUTH_TENANT`).
2. Firestore (console or Admin SDK): `tenants/{id}` with `name`, `status: "active"`, `authTenantId: AUTH_TENANT`,
   `domains: [...]`, `timezone`, `currency`, `commissionRate` (e.g. `0.035`),
   `paymentConfig: { provider: "stripe", chargesEnabled: false }`, `branding: { name, primaryColor, accentColor, logo: null }`,
   and one `tenantDomains/{hostname}` doc `{ tenantId: id }` per hostname (`www` included).
3. Vercel → Domains → add each hostname; DNS: `CNAME` to `cname.vercel-dns.com` (apex: the A record Vercel shows).
4. Add the hostnames to **Authentication → Settings → Authorized domains** and to the reCAPTCHA key (§8).
5. First admin: the owner registers on the marketplace, then set their claims from a trusted machine
   (`gcloud auth application-default login` first):

```bash
node --input-type=module -e "
import { initializeApp, applicationDefault } from 'firebase-admin/app'; import { getAuth } from 'firebase-admin/auth';
initializeApp({ credential: applicationDefault(), projectId: 'PROJECT' });
const auth = getAuth().tenantManager().authForTenant('AUTH_TENANT');
const u = await auth.getUserByEmail('owner@example.com');
await auth.setCustomUserClaims(u.uid, { role: 'tenant_admin', tenantId: 'TENANT_ID' }); await auth.revokeRefreshTokens(u.uid);
console.log('ok', u.uid);"
```

6. The admin connects Stripe in **Admin → Settings → Payments**, sets branding, categories and pages.

## 11. First deploy checklist

- [ ] §1–§9 done; indexes **Enabled**; Vercel build green (`instrumentation.ts` would fail it if misconfigured)
- [ ] `https://PLATFORM_DOMAIN/api/health` → 200; response headers include the nonce CSP and HSTS
- [ ] Register, log in, log out on a marketplace domain; Google sign-in popup works
- [ ] Organizer application → admin approves → organizer creates and publishes an event with a photo
- [ ] Buy a ticket with a Stripe **test-mode** connected account first, then a small live purchase; ticket email
      arrives with QR; PDF downloads; refund works
- [ ] Scanner: staff invite email → set password → scan the QR on a real phone (iOS Safari + Android Chrome)
- [ ] Admin → Sales reports shows the purchase; `Pages` publish shows on the home page
- [ ] App Check enforced (§8.3) and the flows above still work
- [ ] If orders existed before rollups were deployed: `FIREBASE_PROJECT_ID=PROJECT npm run backfill:sales -- --production`
      (run while no payments are in flight)

## 12. Operations

- **Logs**: Vercel → Logs (server errors are one JSON line each, from `instrumentation.ts`); add a log drain for
  retention. Cloud Functions → Cloud Logging.
- **Alerts** (Cloud Monitoring): Functions error rate, `onOrderPaid` failures, Firestore quota; Stripe emails on
  failed webhooks.
- **Rollback**: Vercel → Deployments → *Instant Rollback*; Functions: redeploy the previous commit; rules:
  Firestore → Rules → history.
- **Restore**: from the daily backup (`gcloud firestore databases restore`) into a new database, then switch.
- **Dependencies**: `npm audit --omit=dev` monthly; see `docs/security-review.md` for accepted findings.
