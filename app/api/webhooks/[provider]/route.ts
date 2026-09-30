import { isProviderId, processWebhook } from '@/lib/orders/webhook';

/**
 * Payment provider webhooks (Stripe Connect endpoint: /api/webhooks/stripe).
 * Not behind tenant resolution (proxy.ts skips /api/webhooks) — the tenant comes from the signed event.
 * The raw body is required for signature verification.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProviderId(provider)) return new Response('unknown provider', { status: 404 });
  const raw = await request.text();
  if (raw.length > 256 * 1024) return new Response('too large', { status: 413 });
  try {
    const out = await processWebhook(provider, raw, request.headers);
    return new Response(out.body, { status: out.status });
  } catch (err) {
    console.error('webhook processing failed', err instanceof Error ? err.message : err);
    // 500 → the provider retries; processing is idempotent.
    return new Response('error', { status: 500 });
  }
}
