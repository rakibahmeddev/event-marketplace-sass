import 'server-only';

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getVercelOidcTokenSync } from '@vercel/oidc';

/**
 * Keyless Google credentials on Vercel (Workload Identity Federation): no service-account key exists anywhere.
 *
 * Vercel puts a short-lived OIDC token on every function request (`x-vercel-oidc-token`). We write it to
 * /tmp and point Application Default Credentials at an `external_account` config that trades it, through
 * Google STS, for an access token of the app's service account. firebase-admin (Firestore, Auth, Storage)
 * and the Secret Manager calls all use ADC, so nothing else changes.
 *
 * Enabled only when GCP_WORKLOAD_IDENTITY_PROVIDER is set (Vercel deployments); a no-op everywhere else
 * (local emulators, tests, Cloud Functions).
 */
const CONFIG_FILE = '/tmp/gcp-external-account.json';
const TOKEN_FILE = '/tmp/vercel-oidc-token';

let lastToken: string | undefined;

export type WifEnv = { provider: string; serviceAccount: string };

export function wifEnv(env: Record<string, string | undefined> = process.env): WifEnv | null {
  const provider = env.GCP_WORKLOAD_IDENTITY_PROVIDER;
  const serviceAccount = env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (!provider) return null;
  if (!serviceAccount)
    throw new Error('GCP_SERVICE_ACCOUNT_EMAIL is required with GCP_WORKLOAD_IDENTITY_PROVIDER');
  if (!/^projects\/\d+\/locations\/global\/workloadIdentityPools\/[\w-]+\/providers\/[\w-]+$/.test(provider))
    throw new Error(
      'GCP_WORKLOAD_IDENTITY_PROVIDER must look like projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>',
    );
  return { provider, serviceAccount };
}

/** The ADC `external_account` config (pure; unit-tested). */
export function externalAccountConfig({ provider, serviceAccount }: WifEnv, tokenFile = TOKEN_FILE) {
  return {
    type: 'external_account',
    audience: `//iam.googleapis.com/${provider}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:generateAccessToken`,
    credential_source: { file: tokenFile, format: { type: 'text' } },
  };
}

/**
 * Call before any Google API use in a request (lib/firebase/admin.ts does). Writes the config once per
 * instance and refreshes the token file whenever the request carries a newer token.
 */
export function prepareGoogleCredentials(): void {
  const wif = wifEnv();
  if (!wif) return;
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS !== CONFIG_FILE || !existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, JSON.stringify(externalAccountConfig(wif)), { mode: 0o600 });
    process.env.GOOGLE_APPLICATION_CREDENTIALS = CONFIG_FILE;
  }
  let token: string;
  try {
    // Reads the x-vercel-oidc-token header of the current request (fresh on every request).
    token = getVercelOidcTokenSync();
  } catch {
    if (existsSync(TOKEN_FILE)) return; // outside a request (e.g. after()): keep the last token
    throw new Error(
      'No Vercel OIDC token: enable "Secure backend access with OIDC federation" in the Vercel project',
    );
  }
  if (token !== lastToken || !existsSync(TOKEN_FILE) || readFileSync(TOKEN_FILE, 'utf8') !== token) {
    writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
    lastToken = token;
  }
}
