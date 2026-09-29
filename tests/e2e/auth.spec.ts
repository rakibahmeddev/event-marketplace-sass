import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD, SEED_USERS } from '../../scripts/seed-credentials';

async function login(page: Page, email: string, next = '/') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL((url) => url.pathname === next, { timeout: 15000 });
}

test.describe('sign-in and roles', () => {
  test('attendee logs in, reaches their account, is refused the dashboard, logs out', async ({
    page,
    isMobile,
  }) => {
    await login(page, SEED_USERS.attendee, '/account/tickets');
    await expect(page.getByRole('heading', { name: 'My tickets' })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/forbidden$/);

    if (isMobile) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
    } else {
      await page.getByRole('button', { name: /Jordan Lee/ }).click();
      await page.getByRole('menuitem', { name: 'Log out' }).click();
    }
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/account/tickets');
    await expect(page).toHaveURL(/\/login\?next=/);
  });

  test('organizer reaches the organizer dashboard', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' }).first()).toBeVisible();
  });

  test('tenant admin reaches admin but not the organizer dashboard', async ({ page }) => {
    await login(page, SEED_USERS.admin, '/admin');
    await expect(page.getByText('Tenant admin').first()).toBeAttached();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test('wrong password shows a non-revealing error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(SEED_USERS.attendee);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  });

  test('new visitors can register and are signed in as attendees', async ({ page }) => {
    const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
    await page.goto('/register?next=/account/settings');
    await page.getByLabel('First name').fill('Priya');
    await page.getByLabel('Last name').fill('Shah');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password (8+ characters)', { exact: true }).fill('a-long-test-pass-1');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/account/settings', { timeout: 15000 });
    const details = page.getByRole('main');
    await expect(details.getByText(email)).toBeVisible();
    await expect(details.getByText('Priya Shah')).toBeVisible();
  });
});

test.describe('tenant isolation in the browser', () => {
  test('each hostname shows its own marketplace branding', async ({ page }) => {
    await page.goto('http://other.localhost:3000/');
    await expect(page).toHaveTitle(/Othertix/);
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim(),
    );
    expect(primary.toLowerCase()).toBe('#0f766e');
  });

  test('a demo session is not valid on another marketplace', async ({ page }) => {
    await login(page, SEED_USERS.attendee, '/account/tickets');
    await page.goto('http://other.localhost:3000/account/tickets');
    await expect(page).toHaveURL(/other\.localhost:3000\/login\?next=/);
  });

  test('demo accounts cannot sign in on another marketplace', async ({ page }) => {
    await page.goto('http://other.localhost:3000/login');
    await page.getByLabel('Email').fill(SEED_USERS.attendee);
    await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  });
});
