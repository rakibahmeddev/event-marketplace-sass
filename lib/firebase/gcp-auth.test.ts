import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { externalAccountConfig, wifEnv } = await import('./gcp-auth');
const { secretSource } = await import('@/lib/security/secrets');

const provider = 'projects/123456789/locations/global/workloadIdentityPools/vercel/providers/vercel';

describe('Vercel workload identity federation', () => {
  it('is off unless the provider is configured', () => {
    expect(wifEnv({})).toBeNull();
  });

  it('requires a service account and a well-formed provider name', () => {
    expect(() => wifEnv({ GCP_WORKLOAD_IDENTITY_PROVIDER: provider })).toThrow(/GCP_SERVICE_ACCOUNT_EMAIL/);
    expect(() =>
      wifEnv({
        GCP_WORKLOAD_IDENTITY_PROVIDER: 'vercel',
        GCP_SERVICE_ACCOUNT_EMAIL: 'a@b.iam.gserviceaccount.com',
      }),
    ).toThrow(/must look like/);
  });

  it('builds an external_account config that impersonates the app service account', () => {
    const sa = 'web@proj.iam.gserviceaccount.com';
    const env = wifEnv({ GCP_WORKLOAD_IDENTITY_PROVIDER: provider, GCP_SERVICE_ACCOUNT_EMAIL: sa })!;
    expect(externalAccountConfig(env, '/tmp/t')).toEqual({
      type: 'external_account',
      audience: `//iam.googleapis.com/${provider}`,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${sa}:generateAccessToken`,
      credential_source: { file: '/tmp/t', format: { type: 'text' } },
    });
  });

  it('secrets come from Secret Manager only when SECRET_SOURCE says so', () => {
    expect(secretSource({})).toBe('env');
    expect(secretSource({ SECRET_SOURCE: 'secret-manager' })).toBe('secret-manager');
  });
});
