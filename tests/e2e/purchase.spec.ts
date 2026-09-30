import { expect, test } from '@playwright/test';
import { SEED_USERS } from '../../scripts/seed-credentials';
import { login, logout } from './helpers';

// Full purchase with the local test payment provider. Stateful: desktop only, in order.
test.describe.serial('buying tickets', () => {
  test.skip(({ isMobile }) => isMobile, 'Stateful flow — desktop run only');
  test.describe.configure({ timeout: 90_000 });

  test('signed-out visitors are sent to log in first', async ({ page }) => {
    await page.goto('/events?q=jazz');
    await page
      .getByRole('link', { name: /Sunset Rooftop Jazz/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/events\/sunset-rooftop/, { timeout: 20000 });
    await page.getByRole('button', { name: 'Increase General Admission quantity' }).click();
    await page.getByRole('button', { name: 'Get tickets' }).first().click();
    await expect(page).toHaveURL(/\/login\?next=%2Fevents%2Fsunset-rooftop/, { timeout: 20000 });
  });

  test('attendee buys 2 tickets, pays, gets QR tickets and a PDF', async ({ page }) => {
    await login(page, SEED_USERS.buyer, '/events');
    await page.goto('/events?q=jazz');
    await page
      .getByRole('link', { name: /Sunset Rooftop Jazz/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/events\/sunset-rooftop/, { timeout: 20000 });
    const inc = page.getByRole('button', { name: 'Increase General Admission quantity' });
    await inc.click();
    await inc.click();
    await page.getByRole('button', { name: 'Get tickets' }).first().click();

    await expect(page).toHaveURL(/\/checkout\/[A-Za-z0-9]+$/, { timeout: 20000 });
    await expect(page.getByText('Tickets reserved for')).toBeVisible();
    await page.waitForLoadState('networkidle');
    // Second ticket goes to a friend.
    await page.getByRole('checkbox', { name: 'Same as buyer' }).nth(1).uncheck();
    await page.locator('#a1-name').fill('Sam Ortiz');
    await page.locator('#a1-email').fill('sam.ortiz@example.test');
    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check();
    await page.getByRole('button', { name: /Continue to payment/ }).click();

    await expect(page).toHaveURL(/\/test-payment$/, { timeout: 20000 });
    await page.waitForLoadState('networkidle'); // first compile in dev: wait for hydration before clicking
    await page.getByRole('button', { name: 'Pay (test)' }).click();

    await expect(page).toHaveURL(/\/orders\/[A-Za-z0-9]+\/confirmation$/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: /You’re going/ })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Tickets were also emailed to Sam Ortiz.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ticket QR code' })).toBeVisible();

    const pdfHref = await page.getByRole('link', { name: 'Download PDF' }).getAttribute('href');
    const pdf = await page.request.get(pdfHref!);
    expect(pdf.headers()['content-type']).toBe('application/pdf');
    expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

    await page.getByRole('link', { name: 'View my tickets' }).click();
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('link', { name: 'Show QR' }).first().click();
    await expect(page.getByRole('img', { name: 'Ticket QR code' })).toBeVisible({ timeout: 20000 });
  });

  test('another buyer cannot open that ticket or its PDF', async ({ page }) => {
    await login(page, SEED_USERS.buyer, '/account/tickets');
    await page.getByRole('link', { name: 'Show QR' }).first().click();
    await expect(page).toHaveURL(/\/account\/tickets\/[A-Za-z0-9]+$/, { timeout: 20000 });
    const ticketUrl = page.url();
    const pdfHref = await page.request
      .get('/account/tickets')
      .then(async (r) => /\/api\/orders\/[A-Za-z0-9]+\/pdf/.exec(await r.text())?.[0]);
    await logout(page);

    await login(page, SEED_USERS.organizer, '/');
    expect((await page.goto(ticketUrl))?.status()).toBe(404);
    expect((await page.request.get(pdfHref!)).status()).toBe(404);
  });

  test('free tickets are confirmed without payment', async ({ page }) => {
    await login(page, SEED_USERS.buyer, '/events');
    await page.goto('/events?q=print');
    await page
      .getByRole('link', { name: /Open Studios/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/events\/open-studios/, { timeout: 20000 });
    await page
      .getByRole('button', { name: /Increase .* quantity/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Get tickets' }).first().click();
    await expect(page).toHaveURL(/\/checkout\//, { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check();
    await page.getByRole('button', { name: 'Get free tickets' }).click();
    await expect(page.getByRole('heading', { name: /You’re going/ })).toBeVisible({ timeout: 20000 });
  });

  test('the organizer sees the order and refunds it', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard/orders');
    const row = page.getByRole('row', { name: /Sunset Rooftop Jazz/ }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    page.once('dialog', (d) => void d.accept());
    await row.getByRole('button', { name: 'Refund' }).click();
    await expect(
      page
        .getByRole('row', { name: /Sunset Rooftop Jazz/ })
        .first()
        .getByText('Refunded'),
    ).toBeVisible({ timeout: 20000 });
  });
});
