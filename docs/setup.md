# Local setup

## Requirements

- Node.js 22 (`node -v`)
- Java JDK 21+ — required by the Firestore and Storage emulators (`java -version`).
  macOS: `brew install --cask temurin@21` (or any JDK 21 distribution).
- Playwright browser (once): `npx playwright install chromium`

## Install

```bash
npm install
npm --prefix functions install
cp .env.example .env.local   # already points at the emulators
```

## Run

| Command                              | What it does                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `npm run emulators`                  | Firebase Emulator Suite (Auth 9099, Firestore 8080, Functions 5001, Storage 9199, UI 4000). Data persists in `.emulator-data/`. |
| `npm run dev`                        | Next.js on http://localhost:3000                                                                                                |
| `npm run typecheck` / `npm run lint` | Static checks                                                                                                                   |
| `npm test`                           | Unit tests (Vitest)                                                                                                             |
| `npm run test:rules`                 | Security-rules tests — starts the Firestore + Storage emulators automatically                                                   |
| `npm run test:e2e`                   | Playwright smoke tests at 1280px and 375px                                                                                      |

The project id is `demo-ticketing`. The `demo-` prefix makes the emulators refuse to talk to
any real Firebase project, so local work can never touch production.

## Dev-only pages

- `/dev/style-guide` — every design-system component, mirrors `design/01 Style Guide.dc.html`. Returns 404 in production.

## Secrets

None are needed in Phase 1. From Phase 4, payment keys, webhook secrets, the QR signing secret and
the email API key live in Google Secret Manager and are read only by Cloud Functions. Never put
them in `.env*` files that the Next.js client can read, and never in `NEXT_PUBLIC_*` variables.
