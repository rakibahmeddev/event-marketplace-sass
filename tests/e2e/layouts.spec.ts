import { expect, test } from '@playwright/test';

// Phase 1 smoke test: every layout renders at desktop (1280) and mobile (375)
// without horizontal scroll. Runs in both Playwright projects (see playwright.config.ts).

const routes = [
  { path: '/', shell: 'public' },
  { path: '/events', shell: 'public' },
  { path: '/about', shell: 'public' },
  { path: '/login', shell: 'auth' },
  { path: '/account/tickets', shell: 'public' },
  { path: '/checkout', shell: 'checkout' },
  { path: '/dashboard', shell: 'dashboard' },
  { path: '/admin', shell: 'dashboard' },
  { path: '/scanner', shell: 'scanner' },
] as const;

for (const { path, shell } of routes) {
  test(`${path} renders the ${shell} layout`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    if (shell === 'public') {
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
    }
    if (shell === 'checkout')
      await expect(page.getByText('Secure checkout').or(page.locator('header svg'))).toBeVisible();
    if (shell === 'dashboard')
      await expect(
        page
          .getByRole('navigation', { name: 'Dashboard' })
          .or(page.getByRole('button', { name: 'Open menu' })),
      ).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('unknown routes show the designed 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page left before the encore.' })).toBeVisible();
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['strict-transport-security']).toContain('max-age=');
});
