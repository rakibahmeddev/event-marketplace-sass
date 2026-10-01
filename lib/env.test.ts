import { describe, expect, it } from 'vitest';
import { deployedEnvProblems, isDeployed } from './env';

const good = {
  NODE_ENV: 'production',
  K_SERVICE: 'web',
  FIREBASE_CONFIG: JSON.stringify({
    projectId: 'ticketexpert-prod',
    storageBucket: 'ticketexpert-prod.firebasestorage.app',
  }),
  QR_SIGNING_SECRET: 'x'.repeat(64),
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: '6Lc-public',
  STRIPE_SECRET_KEY: 'unset',
};

describe('deployed environment check', () => {
  it('only runs on the deployed server (App Hosting / Cloud Run)', () => {
    expect(isDeployed({ NODE_ENV: 'production', K_SERVICE: 'web' })).toBe(true);
    expect(isDeployed({ NODE_ENV: 'production' })).toBe(false); // next build, local next start
    expect(isDeployed({ NODE_ENV: 'development', K_SERVICE: 'web' })).toBe(false);
  });

  it('accepts a correct configuration (Stripe may still be unset)', () => {
    expect(deployedEnvProblems(good)).toEqual([]);
  });

  it('rejects emulators, missing App Check, weak QR secret and demo projects', () => {
    const p = deployedEnvProblems({
      ...good,
      NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: 'unset',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      QR_SIGNING_SECRET: 'short',
      FIREBASE_CONFIG: JSON.stringify({ projectId: 'demo-ticketing' }),
    });
    expect(p).toHaveLength(4);
    expect(p.join('\n')).toMatch(/RECAPTCHA[\s\S]*FIRESTORE_EMULATOR_HOST|demo-ticketing/);
  });

  it('catches secrets in public variables', () => {
    expect(deployedEnvProblems({ ...good, NEXT_PUBLIC_STRIPE_KEY: 'sk_live_abc' })).toEqual([
      'NEXT_PUBLIC_STRIPE_KEY looks like a secret — never put secrets in NEXT_PUBLIC_ variables',
    ]);
  });
});
