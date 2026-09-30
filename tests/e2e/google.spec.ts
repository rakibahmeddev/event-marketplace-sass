import { expect, test } from '@playwright/test';

// Google sign-in through the Auth emulator's fake IdP popup. The emulator's popup hand-off is
// timing-sensitive under parallel load, so this test may retry (real-device check: Phase 7).
test.describe.configure({ retries: 2, timeout: 60_000 });
test('Google sign-in creates an attendee account on this marketplace', async ({ page, isMobile }) => {
  // The emulator's popup hand-off is unreliable under Playwright's Android emulation
  // (popup completes, result never reaches the opener). Real-device check: Phase 7.
  test.skip(isMobile, 'Emulator popup hand-off is flaky under mobile emulation');
  await page.goto('/login?next=/account/settings');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('networkidle');
  await popup.getByText('Add new account').click();
  await popup.getByRole('button', { name: /Auto-generate user information/i }).click();
  await popup.getByRole('button', { name: /Sign in with Google\.com/i }).click();

  await expect(page).toHaveURL((url) => url.pathname === '/account/settings', { timeout: 30000 });
  await expect(page.getByRole('main').getByText('You sign in with Google')).toBeVisible();
});
