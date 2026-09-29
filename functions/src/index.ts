import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';

// Region is revisited in Phase 7 (deployment docs).
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// Phase 1 placeholder so the Functions emulator has something to load.
// Returns no data. Real functions (claims, checkout, webhooks, scanning) come in later phases.
export const health = onRequest((_req, res) => {
  res.json({ ok: true });
});
