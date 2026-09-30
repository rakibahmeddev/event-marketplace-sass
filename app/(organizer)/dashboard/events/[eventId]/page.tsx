import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { EventEditor } from '@/components/dashboard/events/EventEditor';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { StatCard } from '@/components/ui/StatCard';
import { listCategories } from '@/lib/categories/repository';
import { timezoneOptions, toEditorValues } from '@/lib/events/editor';
import { getEvent, listTicketTypes } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { requireOrganizer } from '@/lib/organizers/context';
import { eventTotals } from '@/lib/reports/repository';
import { netOf } from '@/lib/reports/summarize';
import { storagePaths } from '@/lib/storage/server';

export const metadata: Metadata = { title: 'Edit event' };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { tenant, organizer } = await requireOrganizer();
  const { eventId } = await params;
  const saved = (await searchParams).saved;
  const event = await getEvent(tenant.id, eventId);
  // Another organizer's event looks exactly like a missing one.
  if (!event || event.organizerId !== organizer.id) notFound();
  const [ticketTypes, categories, totals] = await Promise.all([
    listTicketTypes(tenant.id, event.id),
    listCategories(tenant.id, { includeHidden: true }),
    eventTotals(tenant.id, [event.id]),
  ]);
  const stats = totals.get(event.id);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/events"
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-ink"
        >
          <Icon icon={faArrowLeft} className="text-xs" />
          All events
        </Link>
        <h1 className="type-h4">{event.title}</h1>
      </div>
      {event.status !== 'draft' && (
        <section aria-label="Sales so far" className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
          <StatCard label="Tickets sold" value={(stats ? netOf(stats).tickets : 0).toLocaleString('en-US')} />
          <StatCard
            label="Ticket revenue"
            value={formatMoney(stats ? netOf(stats).organizerEarnings : 0, event.currency)}
            note="after refunds"
          />
          <StatCard label="Orders" value={stats ? netOf(stats).orders : 0} note="after refunds" />
          <StatCard
            label="Checked in"
            value={`${stats?.checkedIn ?? 0}/${stats?.ticketsIssued ?? 0}`}
            note={
              <Link href={`/dashboard/attendees?event=${event.id}`} className="font-semibold text-primary">
                Attendees
              </Link>
            }
          />
        </section>
      )}
      {event.status === 'cancelled' && (
        <Alert tone="danger">This event is cancelled and can no longer be edited.</Alert>
      )}
      <EventEditor
        eventId={event.id}
        initial={toEditorValues(event, ticketTypes)}
        status={event.status}
        slug={event.slug}
        totalSold={event.totalSold}
        currency={event.currency}
        categories={categories
          .filter((c) => c.active || c.id === event.category)
          .map((c) => ({ id: c.id, name: c.name }))}
        timezones={timezoneOptions(tenant.timezone, event.timezone)}
        authTenantId={tenant.authTenantId}
        imageFolder={storagePaths.eventImages(tenant.id, organizer.id, event.id)}
        savedNotice={saved === 'published' || saved === 'saved' ? saved : undefined}
      />
    </>
  );
}
