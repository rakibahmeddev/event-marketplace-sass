import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { EventEditor } from '@/components/dashboard/events/EventEditor';
import { Alert } from '@/components/ui/Alert';
import { Icon } from '@/components/ui/Icon';
import { listCategories } from '@/lib/categories/repository';
import { timezoneOptions, toEditorValues } from '@/lib/events/editor';
import { getEvent, listTicketTypes } from '@/lib/events/repository';
import { requireOrganizer } from '@/lib/organizers/context';
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
  const [ticketTypes, categories] = await Promise.all([
    listTicketTypes(tenant.id, event.id),
    listCategories(tenant.id, { includeHidden: true }),
  ]);

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
