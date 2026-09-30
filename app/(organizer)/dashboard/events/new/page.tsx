import type { Metadata } from 'next';
import { EventEditor } from '@/components/dashboard/events/EventEditor';
import { listCategories } from '@/lib/categories/repository';
import { emptyEditorValues, timezoneOptions } from '@/lib/events/editor';
import { adminDb } from '@/lib/firebase/admin';
import { requireOrganizer } from '@/lib/organizers/context';
import { storagePaths } from '@/lib/storage/server';

export const metadata: Metadata = { title: 'Create event' };

export default async function NewEventPage() {
  const { tenant, organizer } = await requireOrganizer();
  const categories = await listCategories(tenant.id);
  // Reserve an id up front so images can be uploaded into this event's folder before the first save.
  const eventId = adminDb().collection(`tenants/${tenant.id}/events`).doc().id;
  return (
    <>
      <h1 className="type-h4">Create event</h1>
      <EventEditor
        eventId={eventId}
        initial={emptyEditorValues(tenant.timezone)}
        status="new"
        slug={null}
        totalSold={0}
        currency={tenant.currency}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        timezones={timezoneOptions(tenant.timezone)}
        authTenantId={tenant.authTenantId}
        imageFolder={storagePaths.eventImages(tenant.id, organizer.id, eventId)}
      />
    </>
  );
}
