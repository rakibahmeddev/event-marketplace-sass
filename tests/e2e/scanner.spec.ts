import { expect, test, type Page } from '@playwright/test';
import { SEED_PASSWORD, SEED_USERS } from '../../scripts/seed-credentials';
import { login } from './helpers';

// Test data goes straight into the Firestore emulator over REST ("Bearer owner" skips rules; emulator only).
// firebase-admin can't be loaded by Playwright's test loader.
const FIRESTORE = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}/v1/projects/demo-ticketing/databases/(default)/documents`;

type Value = { stringValue: string } | { nullValue: null } | { timestampValue: string };
const str = (v: string): Value => ({ stringValue: v });

async function writeDoc(path: string, fields: Record<string, Value>) {
  const res = await fetch(`${FIRESTORE}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`emulator write failed: ${res.status} ${await res.text()}`);
}

const EVENT = 'seed0000000001';

/** A fresh ticket, so retries never start from an already-used one. */
async function freshTicket(name: string, used = false) {
  const id = `e2e${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  await writeDoc(`tenants/demo/tickets/${id}`, {
    orderId: str('seedorder0001'),
    eventId: str(EVENT),
    ticketTypeId: str('tt2'),
    ticketTypeName: str('General Admission'),
    attendeeName: str(name),
    attendeeEmail: str('e2e.scan@example.com'),
    status: str(used ? 'used' : 'valid'),
    checkedInAt: used ? { timestampValue: new Date().toISOString() } : { nullValue: null },
    checkedInBy: used ? str('e2e') : { nullValue: null },
  });
  return id;
}

async function staffLogin(page: Page, email: string) {
  await page.goto('/scanner');
  await expect(page).toHaveURL(/\/scanner\/login\?next=%2Fscanner/);
  await expect(page.getByRole('heading', { name: /Scan$/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Staff email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL((u) => u.pathname === '/scanner', { timeout: 15000 });
}

/** The camera status line changes only once client effects run (hydrated). No networkidle: the live counter keeps a connection open. */
async function scanScreenReady(page: Page) {
  await expect(page.getByText(/Point the camera|Camera access was blocked|No camera available/)).toBeVisible({
    timeout: 20000,
  });
}

async function enterTicketId(page: Page, id: string) {
  await page.getByRole('button', { name: 'Enter ticket ID' }).click();
  await page.getByRole('dialog').getByLabel('Ticket ID').fill(id);
  await page.getByRole('button', { name: 'Check in' }).click();
}

test.describe.serial('check-in', () => {
  test.skip(({ isMobile }) => isMobile, 'Stateful flow — desktop run only');
  test.describe.configure({ timeout: 90_000 });

  test('organizer adds check-in staff', async ({ page }) => {
    await login(page, SEED_USERS.organizer, '/dashboard/staff');
    await page.waitForLoadState('networkidle');
    const email = `gate-${Date.now()}@example.test`;
    await page.getByLabel('Full name').fill('Gate Keeper');
    await page.getByLabel('Email').fill(email);
    await page
      .getByRole('checkbox', { name: /Neon Tides Live/ })
      .first()
      .check();
    await page.getByRole('button', { name: 'Add staff member' }).click();
    await expect(page.getByText(`We emailed ${email}`)).toBeVisible({ timeout: 20000 });
    const row = page.locator(`tr[data-staff="${email}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Gate Keeper');
    await expect(row.getByRole('switch')).toBeChecked();
  });

  test('scanner checks a ticket in by ID: valid, then already used', async ({ page }) => {
    const id = await freshTicket('Robin Scan');
    await staffLogin(page, SEED_USERS.scanner);
    await expect(page.getByRole('heading', { name: 'Choose an event' })).toBeVisible();
    await expect(page.getByText('Signed in as')).toBeVisible();
    await page.getByRole('link', { name: /Neon Tides Live/ }).click();
    await expect(page).toHaveURL(new RegExp(`/scanner/${EVENT}$`));
    await scanScreenReady(page);

    await enterTicketId(page, id);
    await expect(page.getByRole('heading', { name: 'Valid ticket' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Robin Scan')).toBeVisible();
    await page.getByRole('button', { name: 'Scan next' }).click();

    await enterTicketId(page, id);
    await expect(page.getByRole('heading', { name: 'Already used' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/by Tasha Green/)).toBeVisible();
    await page.getByRole('button', { name: 'Scan next' }).click();

    await enterTicketId(page, 'noSuchTicket42');
    await expect(page.getByRole('heading', { name: 'Invalid ticket' })).toBeVisible({ timeout: 20000 });

    // Staff accounts can't use the attendee area.
    await page.goto('/account/tickets');
    await expect(page).toHaveURL((u) => u.pathname === '/scanner');
  });

  test('attendee list shows check-in status and exports CSV', async ({ page }) => {
    const id = await freshTicket('Casey Listed', true);
    await login(page, SEED_USERS.organizer, '/dashboard/attendees');
    await page.goto(`/dashboard/attendees?event=${EVENT}&q=${id}`);
    const row = page.locator(`tr[data-ticket="${id}"]`);
    await expect(row).toContainText('Casey Listed');
    await expect(row).not.toContainText('Not checked in');

    await page.goto(`/dashboard/attendees?event=${EVENT}&status=out`);
    await expect(page.locator(`tr[data-ticket="${id}"]`)).toHaveCount(0);

    const res = await page.request.get(`/api/dashboard/events/${EVENT}/attendees`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/csv');
    const csv = await res.text();
    expect(csv).toContain('"Casey Listed"');
    expect(csv).toContain('"checked in"');
  });

  test('attendees cannot scan or export', async ({ page }) => {
    await login(page, SEED_USERS.attendee, '/account/tickets');
    await page.goto('/scanner');
    await expect(page).toHaveURL(/\/forbidden$/);
    const res = await page.request.get(`/api/dashboard/events/${EVENT}/attendees`);
    expect(res.status()).toBe(403);
  });
});

test('staff login fits a phone screen', async ({ page }) => {
  await page.goto('/scanner/login');
  await expect(page.getByRole('heading', { name: /Scan$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
