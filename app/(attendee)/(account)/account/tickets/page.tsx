import type { Metadata } from 'next';
import Link from 'next/link';
import { faTicket } from '@fortawesome/free-solid-svg-icons';
import { AccountTabs } from '@/components/account/AccountTabs';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { DateBadge } from '@/components/ui/DateBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { requireUser } from '@/lib/auth/guards';
import { venueLabel } from '@/lib/events/view';
import { eventDateLabels } from '@/lib/format/time';
import { buyerTicketGroups, type TicketGroup } from '@/lib/orders/buyer';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'My tickets' };

function countdown(start: Date | null): string {
  if (!start) return '';
  const days = Math.ceil((start.getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function Group({ g, past }: { g: TicketGroup; past?: boolean }) {
  const labels =
    g.event.startAt && g.event.endAt
      ? eventDateLabels(g.event.startAt, g.event.endAt, g.event.timezone)
      : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line-soft bg-white md:flex-row">
      <div className="flex items-start gap-4 p-5 md:flex-1">
        <DateBadge
          month={labels?.month ?? 'TBA'}
          day={labels?.day ?? '–'}
          variant={past ? 'light' : 'filled'}
        />
        <div className="flex min-w-0 flex-col gap-1">
          {!past && (
            <span className="text-xs font-bold tracking-[0.06em] text-accent-hover uppercase">
              {countdown(g.event.startAt)}
            </span>
          )}
          <Link
            href={`/events/${g.event.slug}`}
            className="font-display text-lg leading-6 font-bold hover:text-primary"
          >
            {g.event.title}
          </Link>
          <span className="text-sm text-slate-600">
            {labels?.short} · {venueLabel(g.event)}
          </span>
          <span className="text-[13px] text-slate-500">
            {g.tickets.length} ticket{g.tickets.length === 1 ? '' : 's'} · Order{' '}
            {g.order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-line-soft border-t border-line-soft md:w-[340px] md:border-t-0 md:border-l">
        {g.tickets.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm">{t.attendeeName}</b>
              <span className="text-xs text-slate-500">{t.ticketTypeName}</span>
            </div>
            {t.status === 'valid' && !past ? (
              <Link
                href={`/account/tickets/${t.id}`}
                className="text-sm font-semibold text-primary hover:text-primary-hover"
              >
                Show QR
              </Link>
            ) : (
              <Badge
                tone={t.status === 'used' ? 'success' : t.status === 'cancelled' ? 'danger' : 'neutral'}
                size="md"
              >
                {t.status === 'used' ? 'Attended' : t.status === 'cancelled' ? 'Cancelled' : 'Not scanned'}
              </Badge>
            )}
          </li>
        ))}
        {!past && (
          <li className="px-5 py-3">
            <a
              href={`/api/orders/${g.order.id}/pdf`}
              className="text-sm font-semibold text-slate-600 hover:text-ink"
            >
              Download PDF
            </a>
          </li>
        )}
      </ul>
    </article>
  );
}

export default async function MyTicketsPage() {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const { upcoming, past } = await buyerTicketGroups(tenant.id, user.uid);
  const name = user.name ?? user.email ?? 'there';
  return (
    <>
      <div className="border-b border-line-soft bg-white">
        <div className="page-container flex flex-col gap-6 pt-8">
          <div className="flex items-center gap-4">
            <Avatar name={name} size="lg" tone="soft" />
            <div>
              <h1 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-[32px] md:leading-10">
                Hi, {name.split(' ')[0]}
              </h1>
              <span className="text-sm text-slate-600">
                {upcoming.length} upcoming event{upcoming.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <AccountTabs active="tickets" />
        </div>
      </div>
      <div className="page-container flex flex-col gap-10 py-8">
        <section className="flex flex-col gap-4">
          <h2 className="type-h5">Upcoming</h2>
          {upcoming.length ? (
            upcoming.map((g) => <Group key={g.order.id} g={g} />)
          ) : (
            <EmptyState
              icon={<Icon icon={faTicket} />}
              title="No upcoming tickets"
              description="Tickets you buy appear here with their QR codes."
              action={<ButtonLink href="/events">Find something to do</ButtonLink>}
            />
          )}
        </section>
        {past.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="type-h5">Past</h2>
            {past.map((g) => (
              <Group key={g.order.id} g={g} past />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
