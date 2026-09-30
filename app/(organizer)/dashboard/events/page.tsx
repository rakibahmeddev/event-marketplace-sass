import type { Metadata } from 'next';
import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { listOrganizerEvents } from '@/lib/events/repository';
import { eventDateLabels } from '@/lib/format/time';
import { requireOrganizer } from '@/lib/organizers/context';

export const metadata: Metadata = { title: 'Events' };

const tone = { draft: 'warning', published: 'success', cancelled: 'danger' } as const;

export default async function OrganizerEventsPage() {
  const { tenant, organizer } = await requireOrganizer();
  const events = await listOrganizerEvents(tenant.id, organizer.id);
  const now = new Date();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-slate-600">
          {events.length} event{events.length === 1 ? '' : 's'}
        </p>
        <ButtonLink
          href="/dashboard/events/new"
          variant="accent"
          leadingIcon={<Icon icon={faPlus} className="text-xs" />}
        >
          Create event
        </ButtonLink>
      </div>
      {events.length === 0 ? (
        <EmptyState
          icon={<Icon icon={faCalendar} />}
          title="No events yet"
          description="Create your first event — you can save it as a draft and publish when it’s ready."
          action={<ButtonLink href="/dashboard/events/new">Create event</ButtonLink>}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Event</TH>
              <TH>Date</TH>
              <TH>Status</TH>
              <TH className="w-56">Sold</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {events.map((e) => {
              const past = e.endAt && e.endAt <= now;
              return (
                <TR key={e.id}>
                  <TD className="max-w-[320px]">
                    <Link href={`/dashboard/events/${e.id}`} className="font-semibold hover:text-primary">
                      {e.title}
                    </Link>
                  </TD>
                  <TD className="whitespace-nowrap text-slate-600">
                    {e.startAt && e.endAt
                      ? eventDateLabels(e.startAt, e.endAt, e.timezone).short
                      : 'Not scheduled'}
                  </TD>
                  <TD>
                    <Badge tone={past && e.status === 'published' ? 'neutral' : tone[e.status]} size="md">
                      {past && e.status === 'published'
                        ? 'Ended'
                        : e.status[0]!.toUpperCase() + e.status.slice(1)}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-slate-600">
                        {e.totalSold.toLocaleString('en-US')} / {e.totalQuantity.toLocaleString('en-US')}
                      </span>
                      <ProgressBar
                        value={e.totalSold}
                        max={Math.max(1, e.totalQuantity)}
                        label={`${e.title} tickets sold`}
                      />
                    </div>
                  </TD>
                  <TD className="text-right whitespace-nowrap">
                    <Link
                      href={`/dashboard/events/${e.id}`}
                      className="text-sm font-semibold text-primary hover:text-primary-hover"
                    >
                      Edit
                    </Link>
                    {e.status !== 'draft' && (
                      <Link
                        href={`/events/${e.slug}`}
                        className="ml-4 text-sm font-semibold text-slate-600 hover:text-ink"
                      >
                        View
                      </Link>
                    )}
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
