import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';

// Region is revisited in Phase 7 (deployment docs).
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

export { onBeforeUserCreated } from './auth/beforeUserCreated.js';
export { setUserRole } from './auth/setUserRole.js';

// Liveness check for the emulator / deploys. Returns no data.
export const health = onRequest((_req, res) => {
  res.json({ ok: true });
});
