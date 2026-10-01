/**
 * Deployed-environment check (Vercel production and preview). Run once at server start by
 * instrumentation.ts: a misconfigured deployment refuses to start instead of running insecurely.
 * Returns a list of problems (empty = fine). Pure, so it is unit-tested.
 */
const REQUIRED = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY', // App Check is mandatory when deployed
  'GCP_WORKLOAD_IDENTITY_PROVIDER',
  'GCP_SERVICE_ACCOUNT_EMAIL',
] as const;

/** Must never be set in a deployment: they would point at emulators, bypass App Check or leak secrets. */
const FORBIDDEN = [
  'NEXT_PUBLIC_USE_FIREBASE_EMULATORS',
  'NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
  'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  // Secrets come from Secret Manager, not from Vercel env.
  'QR_SIGNING_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'TEST_PAYMENT_WEBHOOK_SECRET',
] as const;

export function isDeployed(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview';
}

export function deployedEnvProblems(env: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  for (const k of REQUIRED) if (!env[k]) problems.push(`${k} is required`);
  for (const k of FORBIDDEN) if (env[k]) problems.push(`${k} must not be set in a deployment`);
  if (env.SECRET_SOURCE !== 'secret-manager') problems.push('SECRET_SOURCE must be "secret-manager"');
  if (env.FIREBASE_PROJECT_ID?.startsWith('demo-'))
    problems.push('FIREBASE_PROJECT_ID is an emulator (demo-*) project');
  if (
    env.FIREBASE_PROJECT_ID &&
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    env.FIREBASE_PROJECT_ID !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )
    problems.push('FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_PROJECT_ID differ');
  // Anything secret-looking in a public variable ends up in the browser bundle.
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith('NEXT_PUBLIC_') || !v) continue;
    if (
      /^(sk|rk)_(live|test)_|^whsec_|^re_[A-Za-z0-9]{10,}|-----BEGIN/.test(v) ||
      /SECRET|PRIVATE|PASSWORD/i.test(k)
    )
      problems.push(`${k} looks like a secret — never put secrets in NEXT_PUBLIC_ variables`);
  }
  return problems;
}
