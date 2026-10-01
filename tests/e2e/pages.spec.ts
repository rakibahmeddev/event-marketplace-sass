import { expect, test, type Page } from '@playwright/test';
import { SEED_USERS } from '../../scripts/seed-credentials';
import { login } from './helpers';

// Edits the shared demo home page: desktop only, in order, and resets it to the defaults at the end.
const HEADING = 'Live music, every night <b>no html</b>';
const DEFAULT_HEADING = 'Find the nights you’ll talk about for years.';

async function openHomeEditor(page: Page) {
  await login(page, SEED_USERS.admin, '/admin/pages');
  await page.getByRole('link', { name: /Home The front page/ }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

test.describe.serial('admin page editor', () => {
  test.skip(({ isMobile }) => isMobile, 'Stateful flow — desktop run only');
  test.describe.configure({ timeout: 90_000 });

  test('draft → preview (admins only) → publish', async ({ page, browser }) => {
    await openHomeEditor(page);
    await page.locator('#f-0-heading').fill(HEADING);
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft saved. Visitors still see the published page.')).toBeVisible();

    // Visitors still get the published page; the admin's preview shows the draft as plain text.
    const visitor = await browser.newPage();
    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_HEADING);
    await visitor.goto('/?preview=1');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_HEADING);
    await expect(visitor.getByText('Preview — unpublished changes')).toHaveCount(0);

    const [preview] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: 'Preview' }).click(),
    ]);
    await expect(preview).toHaveURL(/\/\?preview=1$/);
    await expect(preview.getByText('Preview — unpublished changes')).toBeVisible();
    await expect(preview.getByRole('heading', { level: 1 })).toHaveText(HEADING);
    await preview.close();

    // Hide a section and move another, then publish.
    await page.getByRole('switch', { name: 'Show Browse by city' }).uncheck();
    await page.getByRole('button', { name: 'Move How it works up' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published. Visitors now see these changes.')).toBeVisible({
      timeout: 15000,
    });

    await visitor.goto('/');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(HEADING);
    await expect(visitor.getByRole('heading', { name: 'Browse by city' })).toHaveCount(0);
    const order = await visitor.evaluate(() => {
      const y = (t: string) =>
        [...document.querySelectorAll('h2')].find((h) => h.textContent?.includes(t))?.getBoundingClientRect()
          .top ?? 0;
      return y('How it works') < y('Sell tickets with us');
    });
    expect(order).toBe(true);
    await visitor.close();
  });

  test('validation errors are shown on the field and nothing is published', async ({ page }) => {
    await openHomeEditor(page);
    await page.locator('#f-0-heading').fill('');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Check the highlighted fields.')).toBeVisible();
    await expect(page.getByText('Heading is required')).toBeVisible();
  });

  test('stats can be turned on with real numbers', async ({ page }) => {
    await openHomeEditor(page);
    await page.getByRole('button', { name: /^Numbers/ }).click();
    await page.getByRole('switch', { name: 'Show Numbers' }).check();
    await page.locator('[id^="f-"][id$="-items-0-value"]').fill('1,200+');
    await page.locator('[id^="f-"][id$="-items-0-label"]').fill('organizers selling');
    await page.getByRole('button', { name: 'Remove figure 3' }).click();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published. Visitors now see these changes.')).toBeVisible({
      timeout: 15000,
    });
    await page.goto('/');
    await expect(page.getByText('organizers selling')).toBeVisible();
    await expect(page.getByText('1,200+')).toBeVisible();
  });

  test('reset to default and publish restores the original page', async ({ page }) => {
    await openHomeEditor(page);
    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Reset to default' }).click();
    await expect(page.getByText('Draft reset to the built-in content.')).toBeVisible();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Published. Visitors now see these changes.')).toBeVisible({
      timeout: 15000,
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_HEADING);
    await expect(page.getByRole('heading', { name: 'Browse by city' })).toBeVisible();
  });

  test('organizers cannot open the page editor', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard');
    await page.goto('/admin/pages/home');
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
