import 'server-only';

import { applicationDefault } from 'firebase-admin/app';
import { prepareGoogleCredentials } from '@/lib/firebase/gcp-auth';

/** Secrets the web app reads. The same Secret Manager secrets are bound to Cloud Functions with defineSecret. */
export const SECRET_NAMES = ['QR_SIGNING_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
export type SecretName = (typeof SECRET_NAMES)[number];

const TTL_MS = 10 * 60_000; // rotations are picked up within 10 minutes
const cache = new Map<SecretName, { value: string | undefined; expires: number }>();

/** "secret-manager" in deployed environments (set by env); local development reads .env.local. */
export function secretSource(
  env: Record<string, string | undefined> = process.env,
): 'secret-manager' | 'env' {
  return env.SECRET_SOURCE === 'secret-manager' ? 'secret-manager' : 'env';
}

async function fromSecretManager(name: SecretName): Promise<string | undefined> {
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!project) throw new Error('FIREBASE_PROJECT_ID is required to read Secret Manager');
  prepareGoogleCredentials();
  const { access_token } = await applicationDefault().getAccessToken();
  const res = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${name}/versions/latest:access`,
    { headers: { authorization: `Bearer ${access_token}` }, cache: 'no-store' },
  );
  if (res.status === 404) return undefined; // not created (e.g. Stripe not set up yet)
  if (!res.ok) throw new Error(`Secret Manager: ${name} → HTTP ${res.status}`);
  const body = (await res.json()) as { payload?: { data?: string } };
  return body.payload?.data ? Buffer.from(body.payload.data, 'base64').toString('utf8').trim() : undefined;
}

/**
 * A secret's value (undefined if it doesn't exist). Server only — never pass the result to a client
 * component or a NEXT_PUBLIC_ variable. Values are cached in memory per instance.
 */
export async function getSecret(name: SecretName): Promise<string | undefined> {
  if (secretSource() === 'env') return process.env[name] || undefined;
  const hit = cache.get(name);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await fromSecretManager(name);
  cache.set(name, { value, expires: Date.now() + TTL_MS });
  return value;
}
