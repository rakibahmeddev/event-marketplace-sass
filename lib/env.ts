/**
 * Deployed-environment check (Firebase App Hosting, which runs on Cloud Run). Run once at server start by
 * instrumentation.ts: a misconfigured deployment refuses to start instead of running insecurely.
 * Returns a list of problems (empty = fine). Pure, so it is unit-tested.
 */

/** Must never be set in a deployment: they would point at emulators, bypass App Check or enable test payments. */
const FORBIDDEN = [
  'NEXT_PUBLIC_USE_FIREBASE_EMULATORS',
  'NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN',
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
  'TEST_PAYMENT_WEBHOOK_SECRET',
] as const;

type Env = Record<string, string | undefined>;

/** Production server on Cloud Run (App Hosting). Not during `next build`, not locally. */
export function isDeployed(env: Env): boolean {
  return env.NODE_ENV === 'production' && !!env.K_SERVICE;
}

function projectId(env: Env): string | undefined {
  if (env.FIREBASE_PROJECT_ID) return env.FIREBASE_PROJECT_ID;
  try {
    return (JSON.parse(env.FIREBASE_CONFIG ?? '{}') as { projectId?: string }).projectId;
  } catch {
    return undefined;
  }
}

export function deployedEnvProblems(env: Env): string[] {
  const problems: string[] = [];
  const project = projectId(env);
  if (!project) problems.push('No Firebase project: FIREBASE_CONFIG (set by App Hosting) is missing');
  else if (project.startsWith('demo-')) problems.push(`${project} is an emulator (demo-*) project`);
  if ((env.QR_SIGNING_SECRET ?? '').length < 32)
    problems.push(
      'QR_SIGNING_SECRET (32+ chars, from Secret Manager) is required — run `npm run setup:prod`',
    );
  const siteKey = env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;
  if (!siteKey || siteKey === 'unset')
    problems.push(
      'NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY (App Check) is required — run `npm run setup:prod`',
    );
  for (const k of FORBIDDEN) if (env[k]) problems.push(`${k} must not be set in a deployment`);
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
