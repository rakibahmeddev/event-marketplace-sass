# Architecture

> Keep this file updated whenever structure or data flow changes (CLAUDE.md → How to work).

## Status

Phase 1 complete: project setup, design tokens, component library, layouts, emulators.
Everything in `app/` is a stub except the root layout, the 404 page and `/dev/style-guide`.

## Repository layout

```
app/                    Next.js App Router
  layout.tsx            fonts, globals.css, tenant brand colours on <html>
  not-found.tsx         designed 404
  (public)/             SiteHeader + SiteFooter: home, events, events/[slug], o/[slug], become-an-organizer, about, contact
  (auth)/               AuthSplitLayout: login, register
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
  firebase/admin.ts     Admin SDK, server-only
  tenant/branding.ts    Zod schema for tenant branding + CSS-variable mapping
  tenant/current.ts     current tenant lookup (Phase 1: default branding; Phase 2: hostname → tenant)
  payments/             PaymentProvider interface + adapters (Phase 4)
  utils/cn.ts
functions/              Cloud Functions 2nd gen (TypeScript, Node 22) — Phase 1 has only `health`
firestore.rules         deny-all (Phase 1)
storage.rules           deny-all (Phase 1)
tests/rules/            @firebase/rules-unit-testing against the emulators
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

## Security baseline (Phase 1)

- `next.config.ts` sets CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy and
  Permissions-Policy (camera allowed for the scanner only). CSP still allows `'unsafe-inline'` scripts;
  Phase 7 moves to nonces.
- Firestore and Storage rules deny everything; tests in `tests/rules/deny-all.test.ts` prove it.
- Emulator project id `demo-ticketing` cannot reach production.

## Data flow

No data flows yet. Phase 2 adds: middleware tenant resolution → custom claims → rules per role.
