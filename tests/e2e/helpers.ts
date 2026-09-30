import { expect, type Page } from '@playwright/test';
import { SEED_PASSWORD } from '../../scripts/seed-credentials';

export async function login(page: Page, email: string, next = '/') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(SEED_PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL((url) => url.pathname === next.split('#')[0], { timeout: 15000 });
}

export async function logout(page: Page) {
  await page.request.delete('/api/auth/session', { headers: { origin: new URL(page.url()).origin } });
  await page.context().clearCookies();
}

/** 1×1 PNG for upload tests. */
export const tinyPng = {
  name: 'cover.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  ),
};

/** YYYY-MM-DD n days from now (local). */
export function daysFromNow(n: number): string {
  const d = new Date(Date.now() + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}
