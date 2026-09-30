import { getSessionUser } from '@/lib/auth/session';
import { toCsv } from '@/lib/format/csv';
import { centsToInput } from '@/lib/format/money';
import { resolveRange } from '@/lib/reports/days';
import { netOf } from '@/lib/reports/summarize';
import { buildTenantReport } from '@/lib/reports/tenant-report';
import { requireTenant } from '@/lib/tenant/current';

/** Sales report CSV for the marketplace's tenant admin: ?range=…&from=…&to=…&kind=daily|organizers */
export async function GET(req: Request) {
  const [user, tenant] = await Promise.all([getSessionUser(), requireTenant()]);
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (user.role !== 'tenant_admin') return new Response('Forbidden', { status: 403 });

  const p = new URL(req.url).searchParams;
  const range = resolveRange(
    { range: p.get('range') ?? undefined, from: p.get('from') ?? undefined, to: p.get('to') ?? undefined },
    new Date(),
    tenant.timezone,
  );
  const kind = p.get('kind') === 'organizers' ? 'organizers' : 'daily';
  const r = await buildTenantReport(tenant, range);
  const m = (c: number) => centsToInput(c, tenant.currency);
  const money = ['Gross', 'Refunds', 'Net sales', 'Commission', 'Organizer earnings'].map(
    (h) => `${h} (${tenant.currency})`,
  );

  const rows =
    kind === 'daily'
      ? [
          ['Date', 'Orders', 'Tickets', 'Refunded orders', ...money],
          ...r.days.map((d) => {
            const n = netOf(d);
            return [
              d.date,
              String(d.orders),
              String(d.tickets),
              String(d.refundedOrders),
              m(d.gross),
              m(d.refunds),
              m(n.gross),
              m(n.commission),
              m(n.organizerEarnings),
            ];
          }),
        ]
      : [
          ['Organizer', 'Organizer ID', 'Orders', 'Tickets', 'Refunded orders', ...money],
          ...r.byOrganizer.map((o) => {
            const n = netOf(o);
            return [
              o.name,
              o.key,
              String(o.orders),
              String(o.tickets),
              String(o.refundedOrders),
              m(o.gross),
              m(o.refunds),
              m(n.gross),
              m(n.commission),
              m(n.organizerEarnings),
            ];
          }),
        ];

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sales-${kind}-${range.from}-to-${range.to}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
