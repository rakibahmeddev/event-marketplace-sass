/**
 * Waits until the app can resolve the demo tenant (dev server connected to freshly
 * started emulators, tenant cache refreshed) before any test runs.
 */
export default async function globalSetup() {
  const deadline = Date.now() + 90_000;
  let last = '';
  while (Date.now() < deadline) {
    try {
      const res = await fetch('http://localhost:3000/login');
      if (res.ok) {
        await new Promise((r) => setTimeout(r, 2_500)); // let the 2 s dev cache expire once more
        return;
      }
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`App not ready after 90 s (${last}). Are the emulators running and seeded?`);
}
