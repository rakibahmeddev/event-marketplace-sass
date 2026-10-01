# TicketExpert — Event Ticketing Platform

Sell event tickets online. Organizers create events, people buy tickets and get a **QR code**, and door staff
scan the QR codes with a phone.

One installation can run **many marketplaces**. Each marketplace has its own website address (domain), its own
logo and colours, its own users and its own payments.

**Who uses it**

| Person | What they do |
|---|---|
| **Admin** | Runs the marketplace: approves organizers, edits the home page, sets colours and fees, sees sales |
| **Organizer** | Creates events and tickets, sees orders, gives refunds, adds door staff |
| **Attendee** | Buys tickets and gets QR tickets by email |
| **Door staff** | Scans QR tickets at the entrance with a phone |

**Built with:** Next.js · Firebase (Google) · Stripe for payments · Resend for email.

---

## Contents

1. [Try it on your computer](#1-try-it-on-your-computer)
2. [Put it online (connect to Google)](#2-put-it-online-connect-to-google)
3. [Add your own domain](#3-add-your-own-domain)
4. [Payments and emails](#4-payments-and-emails)
5. [Keep it running smoothly](#5-keep-it-running-smoothly)
6. [Common problems](#6-common-problems)
7. [More help](#7-more-help)

---

## 1. Try it on your computer

Nothing goes online in this step. No real money, no real emails.

### What you need

- **Node.js 22** — [nodejs.org](https://nodejs.org)
- **Java 21** — needed by Firebase's local tools. On a Mac: `brew install openjdk@21`

### Start it

Run these commands in the project folder:

```bash
npm install
npm --prefix functions install
```

Create your local settings file with random secret values (Mac):

```bash
cp .env.example .env.local
QR=$(openssl rand -hex 32); WH=$(openssl rand -hex 32)
sed -i '' "s/^QR_SIGNING_SECRET=.*/QR_SIGNING_SECRET=$QR/; s/^TEST_PAYMENT_WEBHOOK_SECRET=.*/TEST_PAYMENT_WEBHOOK_SECRET=$WH/" .env.local
printf 'QR_SIGNING_SECRET=%s\nRESEND_API_KEY=dev\n' "$QR" > functions/.secret.local
```

Start everything:

```bash
npm run dev:all
```

Open **http://localhost:3000**. Press `Ctrl + C` to stop.

### Demo accounts

The login page has **one-click buttons** for these demo accounts:

| Email | Role |
|---|---|
| `admin@demo.test` | Admin |
| `organizer@demo.test` | Organizer |
| `scanner@demo.test` | Door staff (log in at `/scanner/login`) |
| `attendee@demo.test` | Attendee |

The password is in [`scripts/seed-credentials.ts`](scripts/seed-credentials.ts).
Payments use a fake "Pay (test)" page. Emails are not sent — you can read them at **http://localhost:4000** →
Firestore → `devEmails`.

---

## 2. Put it online (connect to Google)

The website and all its data run on **Google Firebase**. You do this once. It takes about 20 minutes.

> **Cost:** Google needs the pay-as-you-go **Blaze** plan, but small sites usually pay **$0–1 per month**.
> Set a budget alert (step 2.4) so you are never surprised.

### 2.1 Create a Firebase project (in the browser)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and click **Add project**.
2. Click **Upgrade** and choose the **Blaze** plan (you need a card).
3. Open **Authentication** → **Get started**. Then **Settings** → **Upgrade to Identity Platform**.
4. Open **Firestore Database** → **Create database** → **Production mode**.
   Choose the location carefully — **you cannot change it later.**
   `us-central1` is the cheapest. `asia-south1` (Mumbai) is faster for South Asia.
5. Open **Storage** → **Get started**.

Write down your **project ID**. It is shown under the project name (for example `ticketexpert-prod`).

### 2.2 Connect your GitHub code (in the browser)

1. In Firebase, open **App Hosting** → **Get started**.
2. Connect your GitHub account and choose this repository.
3. Use these settings:
   - Branch: `main`
   - Root directory: `/`
   - Backend name: `web`
4. Click **Finish**.

The first build will not work yet. That is normal — the next step fixes it.

### 2.3 Run the setup command (on your computer)

Install Google's command-line tool once (Mac):

```bash
brew install --cask google-cloud-sdk
```

Log in once:

```bash
gcloud auth login
npx firebase login
```

Run the setup (use your project ID):

```bash
npm run setup:prod -- --project YOUR-PROJECT-ID
```

The setup asks a few simple questions:

| Question | Example |
|---|---|
| Marketplace id | `ticketexpert` |
| Marketplace name | `TicketExpert` |
| Timezone | `Asia/Dhaka` |
| Currency | `USD` |
| Admin email (you) | `you@gmail.com` |

Then it does everything else for you: security rules, secrets, background jobs, App Check, your first
marketplace and your admin account. At the end it starts the website.

When it finishes, it shows two things:

- **Your website address** — like `https://web--your-project.us-central1.hosted.app`
- **A link to set your admin password** — open it, choose a password, then log in and go to `/admin`

It is safe to run the setup again. It skips anything that is already done.

### 2.4 Set a budget alert (recommended)

Open [console.cloud.google.com/billing](https://console.cloud.google.com/billing) → **Budgets & alerts** →
**Create budget** → amount `$5` → save. Google will email you if spending gets close.

### 2.5 Check that it works

1. Open `https://YOUR-SITE/api/health`. You should see `"ok": true`.
   `yourIp` should be your own internet address (search "what is my ip" to compare).
2. Log in as admin at `/admin` and upload your logo in **Settings**.
3. Make a test account, apply as an organizer, and approve it in **Admin → Organizers**.
4. Create an event with a **free** ticket and get a ticket. It appears in **My tickets**.
5. In the organizer dashboard, add **Check-in staff**, then scan the ticket on a phone at `/scanner/login`.

### 2.6 Turn on App Check

When everything above works: Firebase → **App Check** → **APIs** → click **Enforce** for Cloud Firestore,
Cloud Storage and Cloud Functions. This blocks bots. Test steps 2.5 once more.

---

## 3. Add your own domain

You can use your own address, like `tickets.example.com`, instead of the long `hosted.app` address.

**Step 1 — tell the app about the domain:**

```bash
npm run setup:prod -- domain tickets.example.com --project YOUR-PROJECT-ID
```

**Step 2 — connect the domain in Firebase:**

1. Firebase → **App Hosting** → your backend (`web`) → **Settings** → **Domains** → **Add custom domain**.
2. Type the same domain.
3. Firebase shows some **DNS records** (usually an `A` record and a `TXT` record).

**Step 3 — add the DNS records where you bought the domain** (Namecheap, GoDaddy, Cloudflare, …):

1. Open the DNS settings for your domain.
2. Add each record exactly as Firebase shows it.
3. Wait. It can take from a few minutes up to a few hours. Firebase turns on HTTPS (the padlock) by itself.

**Want both `example.com` and `www.example.com`?** Run Step 1 and Step 2 once for each.

**Another marketplace on another domain?** Run `npm run setup:prod -- --project YOUR-PROJECT-ID` again, give a
new marketplace id, then add its domain with `--marketplace NEW-ID` at the end of the domain command.

---

## 4. Payments and emails

You can go live with **free tickets** first and add these later.

### Payments (Stripe)

```bash
npm run setup:prod -- stripe --project YOUR-PROJECT-ID
```

It asks for two keys from your [Stripe dashboard](https://dashboard.stripe.com) and tells you which **webhook**
to add in Stripe. Use **test keys** (`sk_test_…`) first. Then, in your site: **Admin → Settings → Payments →
Connect Stripe**. Try a purchase with the test card `4242 4242 4242 4242`. Switch to live keys when you are ready.

> **Note:** Stripe does not accept businesses registered in some countries (for example Bangladesh). If that is
> your case, a local payment gateway (like SSLCommerz or bKash) can be added — the code is built to support more
> payment providers.

### Emails (Resend)

```bash
npm run setup:prod -- email --project YOUR-PROJECT-ID
```

First create a free account at [resend.com](https://resend.com), add and verify your domain, and create an
API key. The command asks for the key and the sender address (like `Tickets <tickets@example.com>`).
Until you do this, emails are saved in the database but not sent.

---

## 5. Keep it running smoothly

| You want to… | Do this |
|---|---|
| Update the website | Push your code to GitHub `main`. The site updates by itself in a few minutes. |
| Update background jobs | `npx firebase deploy --only functions --project YOUR-PROJECT-ID` |
| Update security rules | `npx firebase deploy --only firestore:rules,storage --project YOUR-PROJECT-ID` |
| See errors | Firebase → **App Hosting** → **Logs** |
| Undo a bad update | Firebase → **App Hosting** → **Rollouts** → roll back to an earlier one |
| Restore data | Daily backups are kept for 14 days (Firestore → **Backups**) |
| Edit the home page | Your site → **Admin → Pages** → edit → **Preview** → **Publish** |
| Fix sales numbers | `npm run backfill:sales -- --production` (see [docs/deploy.md](docs/deploy.md)) |

**Good habits**

- Keep the budget alert on.
- Run `npm audit` about once a month to check for security updates.
- Never put passwords or secret keys in the code or in GitHub. The setup keeps them in Google Secret Manager.

---

## 6. Common problems

| Problem | Fix |
|---|---|
| **"Cannot reach Firestore"** on your computer | Start everything with `npm run dev:all` |
| **"Java not found"** | Install Java 21 (see section 1) |
| **"Port is already in use"** | Something is already running. Stop it with `Ctrl + C` and try again. |
| **"Marketplace not found"** online | The domain is not connected to a marketplace. Run the `domain` command (section 3). |
| **Login doesn't work on your new domain** | Run the `domain` command for that exact domain (with or without `www`). |
| **The setup stops with an error** | Read the message — it says what to click or fix. Then run the setup again. |
| **Camera doesn't open on the phone** | The camera only works on `https://` addresses (or `localhost`). |
| **Emails are not arriving** | Run the `email` command (section 4) and verify your domain in Resend. |

---

## 7. More help

| File | What's inside |
|---|---|
| [docs/deploy.md](docs/deploy.md) | Going online in more detail |
| [docs/setup.md](docs/setup.md) | Working on the code on your computer |
| [docs/architecture.md](docs/architecture.md) | How the system works inside (for developers) |
| [docs/security-review.md](docs/security-review.md) | How the system is kept secure |
| [docs/deferred.md](docs/deferred.md) | Features planned for later |
| [docs/image-credits.md](docs/image-credits.md) | Where the photos come from |

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev:all` | Start everything on your computer |
| `npm run seed` | Reset the demo data |
| `npm test` | Run the quick tests |
| `npm run test:e2e` | Test the site in a real browser |
| `npm run setup:prod -- --project ID` | Set up or repair the online version |
