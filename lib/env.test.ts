import { describe, expect, it } from 'vitest';
import { deployedEnvProblems, isDeployed } from './env';

const good = {
  VERCEL_ENV: 'production',
  SECRET_SOURCE: 'secret-manager',
  FIREBASE_PROJECT_ID: 'ticketexpert-prod',
  FIREBASE_STORAGE_BUCKET: 'ticketexpert-prod.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIza-public',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'ticketexpert-prod.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'ticketexpert-prod',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'ticketexpert-prod.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:2:web:3',
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: '6Lc-public',
  GCP_WORKLOAD_IDENTITY_PROVIDER: 'projects/1/locations/global/workloadIdentityPools/vercel/providers/vercel',
  GCP_SERVICE_ACCOUNT_EMAIL: 'web@ticketexpert-prod.iam.gserviceaccount.com',
};

describe('deployed environment check', () => {
  it('only runs on Vercel production / preview', () => {
    expect(isDeployed({ VERCEL_ENV: 'production' })).toBe(true);
    expect(isDeployed({ VERCEL_ENV: 'development' })).toBe(false);
    expect(isDeployed({})).toBe(false);
  });

  it('accepts a correct configuration', () => {
    expect(deployedEnvProblems(good)).toEqual([]);
  });

  it('rejects emulators, missing App Check, env secrets and demo projects', () => {
    const p = deployedEnvProblems({
      ...good,
      NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: '',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      STRIPE_SECRET_KEY: 'sk_live_x',
      SECRET_SOURCE: 'env',
      FIREBASE_PROJECT_ID: 'demo-ticketing',
    });
    expect(p).toEqual(
      expect.arrayContaining([
        'NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY is required',
        'FIRESTORE_EMULATOR_HOST must not be set in a deployment',
        'STRIPE_SECRET_KEY must not be set in a deployment',
        'SECRET_SOURCE must be "secret-manager"',
        'FIREBASE_PROJECT_ID is an emulator (demo-*) project',
      ]),
    );
  });

  it('catches secrets in public variables', () => {
    expect(deployedEnvProblems({ ...good, NEXT_PUBLIC_STRIPE_KEY: 'sk_live_abc' })).toEqual([
      'NEXT_PUBLIC_STRIPE_KEY looks like a secret — never put secrets in NEXT_PUBLIC_ variables',
    ]);
    expect(deployedEnvProblems({ ...good, NEXT_PUBLIC_WEBHOOK_SECRET: 'x' })).toHaveLength(1);
  });
});
