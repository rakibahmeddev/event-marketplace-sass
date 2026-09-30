import { expect, test } from '@playwright/test';
import { SEED_USERS } from '../../scripts/seed-credentials';
import { login, logout, tinyPng } from './helpers';

// Changes shared marketplace settings: desktop run only, in order, restoring the colour at the end.
test.describe.serial('admin settings', () => {
  test.skip(({ isMobile }) => isMobile, 'Stateful flow — desktop run only');

  test('refuses unreadable brand colours', async ({ page }) => {
    await login(page, SEED_USERS.admin, '/admin/settings');
    await page.getByLabel('Primary colour', { exact: true }).fill('#FFE066');
    await expect(page.getByText(/Too light for white button text/)).toBeVisible();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Some colours are hard to read.')).toBeVisible({ timeout: 15000 });
  });

  test('colour, logo and social link changes show up on the public site', async ({ page }) => {
    await login(page, SEED_USERS.admin, '/admin/settings');
    await page.getByLabel('Primary colour', { exact: true }).fill('#0F766E');
    // The seed gives the demo marketplace a logo; replace it.
    const remove = page.getByRole('button', { name: 'Remove image' });
    if (await remove.isVisible()) await remove.click();
    await page.locator('input[type=file]').setInputFiles({ ...tinyPng, name: 'logo.png' });
    await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible({ timeout: 15000 });
    await page.getByLabel('YouTube').fill('https://youtube.com/@example');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Settings saved. The marketplace is updated.')).toBeVisible({
      timeout: 15000,
    });

    await page.goto('/');
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim(),
    );
    expect(primary.toLowerCase()).toBe('#0f766e');
    await expect(page.getByRole('banner').getByRole('img', { name: 'TicketExpert' }).first()).toBeVisible();
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'YouTube' }).first(),
    ).toHaveAttribute('href', 'https://youtube.com/@example');
  });

  test('restores the default colour and removes the logo', async ({ page }) => {
    await login(page, SEED_USERS.admin, '/admin/settings');
    await page.getByLabel('Primary colour', { exact: true }).fill('#5B2EE0');
    await page.getByRole('button', { name: 'Remove image' }).click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Settings saved. The marketplace is updated.')).toBeVisible({
      timeout: 15000,
    });
  });

  test('organizers and attendees cannot open settings', async ({ page }) => {
    for (const email of [SEED_USERS.organizer, SEED_USERS.attendee]) {
      await login(page, email, '/');
      await page.goto('/admin/settings');
      await expect(page).toHaveURL(/\/forbidden$/);
      await logout(page);
    }
  });
});
