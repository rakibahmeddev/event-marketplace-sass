# Deferred features

Features that appear in the design (`/design`) or were discussed, but are **outside the MVP**.
The layout may show a placeholder; the feature itself is not built. Do not build these without approval.

## Out of scope per CLAUDE.md

- Seat maps / seating charts ("Pro & venues" pricing tier)
- Full-text search engine (header search box submits a plain keyword filter to `/events`)
- Native mobile apps (scanner is a mobile web page)
- Recurring events
- Discount / promo codes (checkout "Promo code" field, "Promo codes & early bird tiers")
- Waitlists
- SaaS subscription billing for tenants
- Tenant self-signup
- Multi-language
- Advanced analytics (organizer "Reports" page; organizer dashboard shows overview stats only)

## Shown in the design, deferred

| Design                                                 | Where                                                      | Placeholder in MVP                                            |
| ------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Save / wishlist (heart)                                | Event card, event page                                     | Decorative heart on event cards (not interactive)             |
| Follow organizers, follower counts                     | Home, event page, organizer profile, account notifications | Omitted from `OrganizerCard`                                  |
| Reviews & ratings ("4.8 · 2.1k reviews", "Rate event") | Organizer profile, My Tickets                              | Not shown                                                     |
| Ticket transfer                                        | Event page refund copy, My Tickets                         | Not shown                                                     |
| Add to Apple/Google Wallet                             | My Tickets mobile                                          | Not shown                                                     |
| PayPal payments                                        | Checkout, organizer payouts                                | Stripe Connect is the only adapter in MVP                     |
| Sign in with Apple                                     | Login / register                                           | Email/password + Google only                                  |
| Payouts page & sidebar balance                         | Organizer dashboard                                        | Nav item omitted; `DashboardShell` has a `sidebarFooter` slot |
| Notifications bell                                     | Dashboard top bar                                          | Omitted                                                       |
| "Within 25 miles" radius search, location picker       | Browse filters, header                                     | Static location pill in header                                |
| Google Maps embed ("Show map")                         | Event page venue                                           | Address text only                                             |
| Lineup / schedule section, per-event FAQ               | Event page                                                 | Needs data-model fields — ask before adding                   |
| Newsletter subscribe                                   | Home, register checkbox                                    | Not built                                                     |
| Notification preferences                               | Account settings                                           | Not built                                                     |
| "Watch 2-min demo"                                     | Become an organizer                                        | Not built                                                     |
| Careers, Press, Blog, Help center, Resources           | Footer                                                     | Plain text, no link                                           |
| Terms of service, Privacy policy, Refund policy pages  | Footer, checkout consent                                   | Plain text — **needed before launch**, confirm content owner  |
| Social profile links                                   | Footer                                                     | Decorative icons until tenant settings (Phase 6)              |
| FAQ page                                               | Supporting pages                                           | Not in the CLAUDE.md MVP list                                 |
| Duplicate-scan counter, manual "Search name" lookup    | Scanner / attendees                                        | Revisit in Phase 5                                            |
