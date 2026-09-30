import { expect, test } from '@playwright/test';
import { SEED_USERS } from '../../scripts/seed-credentials';
import { login } from './helpers';

// Seed: ~45 days of Pulse Live sales, rolled up by scripts/backfill-sales.ts.
test.describe('dashboards and reports', () => {
  test('organizer dashboard: sales chart with 7D / 30D / 90D', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard');
    const sales = page.getByRole('region', { name: 'Ticket sales' });
    await expect(sales).toBeVisible();
    await expect(sales.getByText(/Last 30 days · \$[\d,]+ gross/)).toBeVisible();
    await expect(sales.getByRole('link', { name: '30D' })).toHaveAttribute('aria-current', 'true');
    // Screen-reader table mirrors the bars: one row per day.
    await expect(sales.locator('table tbody tr')).toHaveCount(30);

    await sales.getByRole('link', { name: '7D' }).click();
    await expect(page).toHaveURL(/\/dashboard\?range=7d$/);
    await expect(page.getByRole('region', { name: 'Ticket sales' }).locator('table tbody tr')).toHaveCount(7);
    await expect(page.getByText('Tickets sold').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent orders' })).toBeVisible();
  });

  test('admin sales report: totals, organizers, custom range and CSV', async ({ page, isMobile }) => {
    await login(page, SEED_USERS.admin, '/admin/reports');
    await expect(page.getByText('Net sales').first()).toBeVisible();
    const byOrg = page.getByRole('region', { name: 'By organizer' });
    await expect(byOrg.getByRole('cell', { name: 'Pulse Live' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Top events' }).getByText('Neon Tides Live')).toBeVisible();

    if (!isMobile) {
      await page.locator('#rep-from').fill('2026-01-01');
      await page.locator('#rep-to').fill('2026-01-31');
      await page.getByRole('button', { name: 'Show' }).click();
      await expect(page).toHaveURL(/range=custom&from=2026-01-01&to=2026-01-31/);
      await expect(page.getByText('Jan 1, 2026 – Jan 31, 2026 · 31 days')).toBeVisible();
    }

    const daily = await page.request.get('/api/admin/reports?range=30d&kind=daily');
    expect(daily.status()).toBe(200);
    expect(daily.headers()['content-type']).toContain('text/csv');
    const lines = (await daily.text()).replace('﻿', '').trim().split('\r\n');
    expect(lines[0]).toContain('"Date","Orders","Tickets"');
    expect(lines).toHaveLength(31); // header + 30 days

    const orgs = await page.request.get('/api/admin/reports?range=90d&kind=organizers');
    expect(await orgs.text()).toContain('"Pulse Live"');
  });

  test('organizers cannot open the marketplace report', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard');
    await page.goto('/admin/reports');
    await expect(page).toHaveURL(/\/forbidden$/);
    expect((await page.request.get('/api/admin/reports')).status()).toBe(403);
  });
});
