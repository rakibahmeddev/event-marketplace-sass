# CLAUDE.md — Event Ticketing SaaS

## Project overview
A multi-tenant SaaS platform for event ticketing marketplaces (concerts, sports events, workshops, festivals). Each tenant is a business that runs its own branded marketplace on its own domain. Inside each tenant, multiple organizers (vendors) create events and sell tickets. Attendees buy tickets and receive QR-code tickets by email. Staff scanner accounts check attendees in at the gate.

- The first tenant is a client launching an Eventbrite-style marketplace. Build for them first, but every part of the system must be multi-tenant from day one.
- The platform (code, infrastructure, IP) belongs to the platform owner. Tenants are customers, not code owners.
- The UI design has been provided. Implement it faithfully, but follow the MVP scope below. If the design includes a feature outside the MVP, build the layout with a placeholder and list it in `docs/deferred.md`. Do not build it.

## Tech stack
- **Frontend:** Next.js (App Router), TypeScript (strict mode), React Server Components where possible
- **Styling:** Tailwind CSS with design tokens taken from the provided design (colors, typography, radius, spacing, shadows)
- **Auth:** Firebase Authentication (email/password + Google), with custom claims for roles
- **Database:** Cloud Firestore
- **Backend logic:** Cloud Functions for Firebase (2nd gen, TypeScript) and Next.js server actions/route handlers using the Firebase Admin SDK
- **Storage:** Firebase Storage (event images, organizer logos)
- **Security:** Firebase App Check, Firestore and Storage Security Rules, Google Secret Manager for secrets
- **Validation:** Zod on every input, both client and server
- **Email:** Transactional email provider (Resend or SendGrid) called from Cloud Functions only
- **Payments:** Provider-agnostic payment layer (see Payments). First adapter: Stripe Connect
- **Testing:** Vitest for logic, `@firebase/rules-unit-testing` with the Firebase Emulator Suite for security rules, Playwright for key flows
- **Local development:** Firebase Emulator Suite for everything. Never test against production.

## Roles
Stored as Firebase Auth custom claims: `{ role, tenantId, organizerId? }`. Claims are only set by Cloud Functions, never by the client.

| Role | Access |
|---|---|
| `platform_admin` | Manages all tenants. Platform owner only. |
| `tenant_admin` | Manages one tenant: approves organizers, categories, commission, settings, reports. |
| `organizer` | Manages own events, ticket types, orders, attendees and scanner staff within one tenant. |
| `scanner` | Can only verify and check in tickets for events they are assigned to. No other access. |
| `attendee` | Buys tickets, views own tickets and orders. |

## Data model (Firestore)
All tenant data lives under the tenant document so security rules can isolate tenants.

```
tenants/{tenantId}                         name, domains[], branding, commissionRate, paymentConfig (non-secret), status
tenants/{tenantId}/organizers/{organizerId} name, slug, logo, bio, status (pending|approved|suspended), ownerUid
tenants/{tenantId}/events/{eventId}         organizerId, title, slug, category, description, images[], venue, startAt, endAt, status (draft|published|cancelled), publishedAt
tenants/{tenantId}/events/{eventId}/ticketTypes/{ticketTypeId}  name, price, currency, quantity, sold, reserved, salesStartAt, salesEndAt
tenants/{tenantId}/orders/{orderId}         buyerUid, eventId, organizerId, items[], subtotal, fees, total, currency, status (pending|paid|failed|refunded|expired), paymentRef, createdAt
tenants/{tenantId}/tickets/{ticketId}       orderId, eventId, ticketTypeId, attendeeName, attendeeEmail, status (valid|used|cancelled), checkedInAt, checkedInBy
tenants/{tenantId}/scannerAssignments/{uid} eventIds[], organizerId
tenants/{tenantId}/auditLogs/{logId}        actorUid, action, target, createdAt
users/{uid}                                 tenantId, displayName, email, createdAt (no role data here; roles live in claims)
```

Money is always stored as integers in the smallest currency unit (cents). Never floats.

## Security requirements (non-negotiable)
1. **Tenant isolation:** Every security rule checks `request.auth.token.tenantId == tenantId`. Write rules tests proving a user of tenant A cannot read or write anything in tenant B.
2. **Deny by default:** Rules start with deny-all. Open only what each role needs.
3. **No trusted client writes:** The client never writes prices, totals, order status, ticket status, `sold` counts, roles or commission. These are written only by Cloud Functions or server code with the Admin SDK.
4. **Validate everything:** Zod schemas on all server actions, route handlers and callable functions. Reject unknown fields.
5. **Secrets:** Payment keys, webhook secrets, QR signing secret and email keys live in Secret Manager. Nothing secret in `NEXT_PUBLIC_*` variables or client bundles.
6. **App Check:** Enforced on Firestore, Storage and callable functions.
7. **Rate limiting:** On login-adjacent endpoints, checkout creation and ticket scanning.
8. **Audit log:** Record role changes, organizer approvals, refunds, check-ins and settings changes.
9. **Storage rules:** Images only, size limit (5 MB), path scoped to tenant and organizer.
10. **Headers:** Content Security Policy, HSTS, X-Frame-Options, Referrer-Policy set in Next.js config.
11. **Dependencies:** Keep minimal. Ask before adding any new package.

## Tickets and QR check-in
- QR payload = `ticketId` + `tenantId` + HMAC-SHA256 signature using a secret from Secret Manager. The QR contains no personal data.
- Scanning calls a callable Cloud Function that:
  1. verifies the caller has role `scanner` (or `organizer` owning the event) in the same tenant,
  2. verifies the signature,
  3. verifies the scanner is assigned to that event,
  4. in a Firestore transaction, changes status `valid` → `used`, recording `checkedInAt` and `checkedInBy`.
- Responses: `valid` (with attendee name and ticket type), `already_used` (with first check-in time), `invalid`.
- The scanner screen is a mobile-first page in the Next.js app using the device camera. No native app in MVP.

## Payments
- Build a `PaymentProvider` interface (`createCheckout`, `handleWebhook`, `refund`) so providers can be swapped per tenant.
- First adapter: Stripe Connect. The tenant connects its own payment account. The platform never stores card data.
- Checkout flow: server creates a `pending` order and reserves ticket quantity in a transaction (no overselling). The reservation expires after 10 minutes via a scheduled function.
- Webhooks: verify the signature, process idempotently (store processed event IDs), then mark the order `paid`, create tickets, increment `sold` and send the ticket email.
- Commission is calculated server-side from `tenants/{tenantId}.commissionRate`.

## Multi-tenancy routing
- Next.js middleware resolves the tenant from the request hostname (custom domain or subdomain) and looks it up in `tenants` via a cached server lookup.
- Tenant branding (logo, colors, name) is applied through CSS variables at runtime from the tenant document.

## MVP scope
**Public:** Home, events listing with basic filters (category, date, location, free/paid), single event page, organizer public profile, become-an-organizer page, login/register, about, contact.
**Attendee:** Cart/checkout, order confirmation, My Tickets (QR view, PDF download), orders.
**Organizer dashboard:** Overview stats, create/edit events, ticket types, orders, attendee list with check-in status, manage scanner staff.
**Tenant admin dashboard:** Approve/suspend organizers, manage categories, commission and branding settings, sales reports.
**Scanner:** Login, select assigned event, scan QR, result screen, live check-in counter.
**Emails:** Order confirmation with QR tickets, organizer approval, staff invitation.

**Out of scope for MVP** (list in `docs/deferred.md`, do not build): seat maps, full-text search engine, native mobile apps, recurring events, discount codes, waitlists, SaaS subscription billing for tenants, tenant self-signup, multi-language, advanced analytics.

## Project structure
```
/app                 Next.js routes, grouped: (public), (attendee), (organizer), (admin), scanner
/components          UI components built from the design system
/lib                 firebase client, firebase admin, validation schemas, utils
/lib/payments        PaymentProvider interface and adapters
/functions           Cloud Functions (TypeScript)
/firestore.rules
/storage.rules
/tests/rules         security rules tests
/docs                architecture.md, deferred.md, setup.md
```

## How to work
1. **Plan first.** Before writing code for any phase, show the plan (files to create, data flow, rules changes) and wait for approval.
2. **Work in phases** and stop for review after each:
   - Phase 1: Project setup, design tokens, component library, layouts, emulators
   - Phase 2: Auth, roles and custom claims, tenant resolution, security rules with tests
   - Phase 3: Organizers and events (CRUD, images, public pages)
   - Phase 4: Checkout, payments, webhooks, ticket generation, email
   - Phase 5: Scanner and check-in
   - Phase 6: Dashboards and reports
   - Phase 7: Security hardening review, performance, deployment docs
3. **Security rules and their tests are written together** with each feature, never later.
4. **Small, focused commits** with clear messages.
5. **Ask before** adding dependencies, changing the data model, or going beyond MVP scope.
6. **Keep `docs/architecture.md` updated** when structure or data flow changes.
7. Use `.env.example` for all required variables. Never commit real keys.
