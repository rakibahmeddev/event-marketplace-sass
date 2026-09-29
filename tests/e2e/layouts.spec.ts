import { expect, test } from '@playwright/test';

// Layout smoke test at desktop (1280) and mobile (375), no horizontal scroll.
// Needs emulators + seed (npm run test:e2e does both).

const publicRoutes = ['/', '/events', '/about'];
// Split layout: no site header on desktop (design 11), so check the page heading instead.
const authRoutes = [
  ['/login', 'Welcome back'],
  ['/register', 'Create your account'],
  ['/forgot-password', 'Reset your password'],
] as const;
const protectedRoutes = ['/account/tickets', '/checkout', '/dashboard', '/admin', '/scanner'];

for (const path of publicRoutes) {
  test(`${path} renders without horizontal scroll`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('banner').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const [path, heading] of authRoutes) {
  test(`${path} renders without horizontal scroll`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const path of protectedRoutes) {
  test(`${path} sends signed-out visitors to login`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(path)}`));
  });
}

test('unknown routes show the designed 404', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page left before the encore.' })).toBeVisible();
});

test('unknown hostnames show "marketplace not found"', async ({ request }) => {
  const res = await request.get('http://unknown.localhost:3000/');
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain('Marketplace not found');
});

test('security headers are set', async ({ request }) => {
  const res = await request.get('/');
  const headers = res.headers();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['strict-transport-security']).toContain('max-age=');
});
