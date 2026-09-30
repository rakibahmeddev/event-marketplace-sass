import { expect, test } from '@playwright/test';
import { SEED_USERS } from '../../scripts/seed-credentials';
import { daysFromNow, login, logout, tinyPng } from './helpers';

test.describe('public discovery', () => {
  test('home lists seeded events and links to the event page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Trending events' })).toBeVisible();
    await page
      .getByRole('link', { name: /Sunset Rooftop Jazz Sessions/ })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sunset Rooftop Jazz Sessions' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Select tickets' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Checkout opens soon|Opens soon/ }).first()).toBeDisabled();
  });

  test('browse filters by category, price and keyword', async ({ page }) => {
    await page.goto('/events?category=workshops');
    await expect(page.getByRole('link', { name: /Intro to Ceramics/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Neon Tides/ })).toHaveCount(0);

    await page.goto('/events?price=free');
    await expect(page.getByRole('link', { name: /Open Studios/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Stand-Up Saturdays/ })).toHaveCount(0);

    await page.goto('/events?q=jazz');
    await expect(page.getByRole('link', { name: /Sunset Rooftop Jazz/ })).toBeVisible();
    await expect(page.getByText('1 event', { exact: true })).toBeVisible();
  });

  test('organizer profile shows upcoming events', async ({ page }) => {
    await page.goto('/o/pulse-live');
    await expect(page.getByRole('heading', { level: 1, name: 'Pulse Live' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Upcoming events \(\d+\)/ })).toBeVisible();
  });

  test('unknown events and organizers are 404', async ({ page }) => {
    expect((await page.goto('/o/nobody-here'))?.status()).toBe(404);
    expect((await page.goto('/events/does-not-exist'))?.status()).toBe(404);
  });

  test('add to calendar downloads an .ics file', async ({ request }) => {
    const html = await (await request.get('/events?q=jazz')).text();
    const slug = /\/events\/(sunset-rooftop-jazz[^"?]+)/.exec(html)?.[1];
    const res = await request.get(`/events/${slug}/calendar`);
    expect(res.headers()['content-type']).toContain('text/calendar');
    expect(await res.text()).toContain('SUMMARY:Sunset Rooftop Jazz Sessions');
  });
});

// The flows below change shared data; run them once (desktop project), in order.
test.describe.serial('organizer workflow', () => {
  test.skip(({ isMobile }) => isMobile, 'Stateful flow — desktop run only');

  const title = `E2E Launch Party ${Date.now()}`;

  test('an organizer creates, uploads a cover and publishes an event', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard/events');
    await page.getByRole('link', { name: 'Create event' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create event' })).toBeVisible();

    await page.getByLabel('Event title').fill(title);
    await page.getByLabel('Category').selectOption('music-concerts');
    await page.locator('input[type=file]').setInputFiles(tinyPng);
    await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Start date', { exact: true }).fill(daysFromNow(20));
    await page.getByLabel('Start time', { exact: true }).fill('19:00');
    await page.getByLabel('End date', { exact: true }).fill(daysFromNow(20));
    await page.getByLabel('End time', { exact: true }).fill('23:00');
    await page.getByLabel('Venue name').fill('E2E Hall');
    await page.getByLabel('City', { exact: true }).fill('Brooklyn');
    await page.getByLabel('About this event').fill('A launch party written by a robot.');
    await page.getByLabel('Ticket 1 name').fill('General');
    await page.getByLabel('Ticket 1 price').fill('25');
    await page.getByLabel('Ticket 1 quantity').fill('100');

    await page.getByRole('button', { name: 'Publish event' }).click();
    await expect(page.getByText('Published! Your event is live.')).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard\/events\/[A-Za-z0-9]+$/);

    await page.goto(`/events?q=${encodeURIComponent('launch')}`);
    await page
      .getByRole('link', { name: new RegExp(title) })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('$25').first()).toBeVisible();
    await expect(page.locator('img[alt="' + title + '"]')).toBeVisible();
  });

  test('publishing refuses an incomplete event', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard/events/new');
    await page.getByLabel('Event title').fill('Incomplete event');
    await page.getByRole('button', { name: 'Publish event' }).click();
    await expect(page.getByText(/To publish, complete:/)).toBeVisible({ timeout: 15000 });
  });

  test('an admin approves a pending applicant, who then gets the dashboard', async ({ page }) => {
    // Pending organizers have no public profile.
    expect((await page.goto('/o/clay-collective'))?.status()).toBe(404);
    await login(page, SEED_USERS.applicant, '/become-an-organizer');
    await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/forbidden$/);
    await logout(page);

    await login(page, SEED_USERS.admin, '/admin/organizers');
    const row = page.getByRole('row', { name: /Clay Collective/ });
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByRole('row', { name: /Clay Collective/ })).toHaveCount(0, { timeout: 15000 });
    await logout(page);

    await login(page, SEED_USERS.applicant, '/dashboard/events');
    await expect(page.getByText('No events yet')).toBeVisible();
    // Someone else's event is indistinguishable from a missing one.
    expect((await page.goto('/dashboard/events/seed0000000001'))?.status()).toBe(404);
    expect((await page.goto('/o/clay-collective'))?.status()).toBe(200);
  });

  test('a brand-new visitor signs up and applies as an organizer', async ({ page, request }) => {
    const email = `org-${Date.now()}@example.test`;
    await page.goto('/become-an-organizer#register');
    await page.getByLabel('First name').fill('Ava');
    await page.getByLabel('Last name').fill('Stone');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password (8+ characters)', { exact: true }).fill('a-long-test-pass-1');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Step 2 · Your organization' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByLabel('Organization name').fill(`Stone Sessions ${Date.now() % 10000}`);
    await expect(page.getByText('✓ Available')).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Main category').selectOption('comedy');
    await page.getByLabel('City').fill('Austin, TX');
    await page.locator('input[type=file]').setInputFiles({ ...tinyPng, name: 'logo.png' });
    await expect(page.getByRole('button', { name: 'Remove image' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Application received' })).toBeVisible({ timeout: 15000 });
    expect(request).toBeTruthy();
  });

  test('taken profile URLs are refused', async ({ page }) => {
    await login(page, SEED_USERS.attendee, '/become-an-organizer');
    await page.getByLabel('Organization name').fill('Pulse Live');
    await expect(page.getByText('Already taken')).toBeVisible({ timeout: 10000 });
  });

  test('an admin adds a category and it appears in the filters', async ({ page }) => {
    const name = `Food ${Date.now() % 100000}`;
    await login(page, SEED_USERS.admin, '/admin/categories');
    await page.getByLabel('New category').fill(name);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByLabel(`${name} name`)).toBeVisible({ timeout: 15000 });
    await page.goto('/events');
    await expect(page.getByRole('link', { name })).toBeVisible();
  });

  test('attendees cannot reach the event editor', async ({ page }) => {
    await login(page, SEED_USERS.attendee, '/account/tickets');
    await page.goto('/dashboard/events/new');
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
