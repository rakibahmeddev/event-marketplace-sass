import { expect, test } from '@playwright/test';

test.describe('security headers', () => {
  test('pages: nonce-based CSP, a fresh nonce per request, and the standard headers', async ({
    request,
    page,
  }) => {
    const a = await request.get('/');
    const b = await request.get('/');
    const csp = a.headers()['content-security-policy']!;
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(b.headers()['content-security-policy']).not.toContain(nonce!);
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(a.headers()['x-frame-options']).toBe('DENY');
    expect(a.headers()['x-content-type-options']).toBe('nosniff');
    expect(a.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(a.headers()['strict-transport-security']).toContain('max-age=');
    expect(a.headers()['permissions-policy']).toContain('camera=(self)');
    expect(a.headers()['x-powered-by']).toBeUndefined();

    // Every script tag the server renders carries this response's nonce.
    const html = await a.text();
    const tags = html.match(/<script\b[^>]*>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag, tag).toContain(`nonce="${nonce}"`);

    // And the page runs without CSP violations (scripts added at runtime are allowed by 'strict-dynamic').
    const violations: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to (execute|load)/i.test(m.text())) violations.push(m.text());
    });
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    expect(violations).toEqual([]);
  });

  test('API routes get a deny-all CSP', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.headers()['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
  });
});
