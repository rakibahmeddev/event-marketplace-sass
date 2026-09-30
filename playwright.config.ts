import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against its OWN Next.js dev server on port 3100 (separate build dir .next-e2e), started fresh
 * each run and connected to the emulators that `npm run test:e2e` starts. It never reuses the developer's
 * `npm run dev` on :3000, whose Firestore connection may be stale after emulator restarts.
 */
export const E2E_PORT = 3100;
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: { baseURL: E2E_ORIGIN },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-e2e npx next dev -p ${E2E_PORT}`,
    url: `${E2E_ORIGIN}/api/health`,
    reuseExistingServer: false,
    timeout: 180000,
  },
});
