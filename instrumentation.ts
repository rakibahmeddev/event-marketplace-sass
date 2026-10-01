import type { Instrumentation } from 'next';
import { deployedEnvProblems, isDeployed } from './lib/env';

/** Runs once per server instance before it serves requests. */
export function register() {
  if (!isDeployed(process.env)) return;
  const problems = deployedEnvProblems(process.env);
  // Refuse to start rather than run with emulators, without App Check or with secrets in env vars.
  if (problems.length) throw new Error(`Unsafe deployment configuration:\n- ${problems.join('\n- ')}`);
}

/** Server errors → one structured log line (Vercel logs / log drains). No request bodies or personal data. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  console.error(
    JSON.stringify({
      severity: 'ERROR',
      message: err instanceof Error ? err.message : String(err),
      digest: typeof err === 'object' && err && 'digest' in err ? String(err.digest) : undefined,
      method: request.method,
      path: request.path.split('?')[0],
      routePath: context.routePath,
      routeType: context.routeType,
    }),
  );
};
