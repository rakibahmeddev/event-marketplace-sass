import 'server-only';

/**
 * Secrets the web app reads. Deployed on Firebase App Hosting, apphosting.yaml maps each one to a Google Secret
 * Manager secret, injected at runtime only (never at build, never into the client bundle). Locally they come
 * from .env.local. The same Secret Manager secrets are bound to Cloud Functions with defineSecret.
 */
export const SECRET_NAMES = ['QR_SIGNING_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
export type SecretName = (typeof SECRET_NAMES)[number];

/** Value set by `npm run setup:prod` for services that aren't connected yet (e.g. Stripe). */
export const UNSET = 'unset';

/** A secret's value, or undefined when missing or still the "unset" placeholder. Server only. */
export async function getSecret(name: SecretName): Promise<string | undefined> {
  const value = process.env[name]?.trim();
  return value && value !== UNSET ? value : undefined;
}
