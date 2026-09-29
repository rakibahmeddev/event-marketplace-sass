/** Liveness probe for deploys and test runners. Skips tenant resolution (see proxy.ts matcher). No data. */
export function GET() {
  return Response.json({ ok: true });
}
