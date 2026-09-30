import type { Metadata } from 'next';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faCheck, faFileCsv, faMagnifyingGlass, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { initials } from '@/components/ui/Avatar';
import { attendeeSummary, filterAttendees, parseAttendeeFilter } from '@/lib/attendees/view';
import { listOrganizerEvents } from '@/lib/events/repository';
import { eventDateLabels } from '@/lib/format/time';
import { listEventTickets } from '@/lib/orders/repository';
import { requireOrganizer } from '@/lib/organizers/context';

export const metadata: Metadata = { title: 'Attendees' };

const PAGE_SIZE = 50;

type Search = { event?: string; status?: string; q?: string; page?: string };

export default async function AttendeesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { tenant, organizer } = await requireOrganizer();
  const sp = await searchParams;
  const events = (await listOrganizerEvents(tenant.id, organizer.id)).filter((e) => e.status !== 'draft');

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={faUsers} />}
        title="No attendees yet"
        description="Publish an event — people who buy tickets show up here."
      />
    );
  }

  // Default: the next upcoming event, else the most recent one.
  const now = new Date();
  const upcoming = events
    .filter((e) => e.startAt && e.endAt && e.endAt >= now)
    .sort((a, b) => a.startAt!.getTime() - b.startAt!.getTime())[0];
  const event = events.find((e) => e.id === sp.event) ?? upcoming ?? events[0]!;
  const filter = parseAttendeeFilter(sp.status);
  const q = (sp.q ?? '').slice(0, 100);

  const all = await listEventTickets(tenant.id, event.id);
  const summary = attendeeSummary(all);
  const rows = filterAttendees(all, filter, q);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pct = summary.total > 0 ? (summary.checkedIn / summary.total) * 100 : 0;
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    hour: 'numeric',
    minute: '2-digit',
  });
  const label = (e: (typeof events)[number]) =>
    e.startAt && e.endAt
      ? `${e.title} · ${eventDateLabels(e.startAt, e.endAt, e.timezone).short.split(' · ')[0]}`
      : e.title;

  const hrefFor = (p: number) => {
    const u = new URLSearchParams({ event: event.id });
    if (filter !== 'all') u.set('status', filter);
    if (q) u.set('q', q);
    if (p > 1) u.set('page', String(p));
    return `/dashboard/attendees?${u}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <form method="get" className="flex flex-wrap items-center gap-3" role="search">
        <label className="sr-only" htmlFor="att-event">
          Event
        </label>
        <div className="min-w-[220px] flex-1 md:max-w-[320px]">
          <Select id="att-event" name="event" defaultValue={event.id}>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {label(e)}
              </option>
            ))}
          </Select>
        </div>
        <label className="sr-only" htmlFor="att-status">
          Check-in status
        </label>
        <div className="w-[170px]">
          <Select id="att-status" name="status" defaultValue={filter}>
            <option value="all">All statuses</option>
            <option value="in">Checked in</option>
            <option value="out">Not checked in</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, email or ticket ID"
            aria-label="Search attendees"
            leadingIcon={<Icon icon={faMagnifyingGlass} />}
          />
        </div>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        <a
          href={`/api/dashboard/events/${event.id}/attendees`}
          download
          className={buttonClasses({ variant: 'secondary' })}
        >
          <Icon icon={faFileCsv} />
          Export CSV
        </a>
      </form>

      <section
        aria-label="Check-in summary"
        className="flex flex-col gap-4 rounded-card border border-line-soft bg-white px-6 py-5 md:flex-row md:items-center md:gap-8"
      >
        <div>
          <span className="text-[13px] text-slate-600">Checked in</span>
          <div className="font-display text-[30px] font-extrabold">
            {summary.checkedIn} <span className="text-lg text-slate-500">/ {summary.total}</span>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Check-in progress"
          aria-valuemin={0}
          aria-valuemax={summary.total}
          aria-valuenow={summary.checkedIn}
          className="h-3 flex-1 overflow-hidden rounded-full bg-line-soft"
        >
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-6 text-sm">
          <span>
            <b className="text-success">{summary.checkedIn}</b> in
          </span>
          <span>
            <b>{summary.notYet}</b> not yet
          </span>
        </div>
      </section>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Icon icon={faCalendar} />}
          title={all.length === 0 ? 'No tickets sold yet' : 'No attendees match'}
          description={
            all.length === 0
              ? 'Attendees appear here once orders are paid.'
              : 'Try a different search or status.'
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Attendee</TH>
                <TH>Email</TH>
                <TH>Ticket</TH>
                <TH>Ticket ID</TH>
                <TH>Check-in</TH>
              </tr>
            </THead>
            <TBody>
              {shown.map((t) => (
                <TR key={t.id} data-ticket={t.id}>
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                        {initials(t.attendeeName) || '?'}
                      </span>
                      <b>{t.attendeeName}</b>
                    </span>
                  </TD>
                  <TD className="text-slate-600">{t.attendeeEmail}</TD>
                  <TD className="whitespace-nowrap">{t.ticketTypeName}</TD>
                  <TD className="font-mono text-[13px]">{t.id}</TD>
                  <TD className="whitespace-nowrap">
                    {t.status === 'used' ? (
                      <Badge tone="success" size="md" icon={<Icon icon={faCheck} />}>
                        {t.checkedInAt ? time.format(t.checkedInAt) : 'Checked in'}
                      </Badge>
                    ) : t.status === 'cancelled' ? (
                      <Badge tone="danger" size="md">
                        Cancelled
                      </Badge>
                    ) : (
                      <Badge tone="neutral" size="md">
                        Not checked in
                      </Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="flex flex-col items-center justify-between gap-3 text-sm text-slate-600 md:flex-row">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + shown.length} of {rows.length}
            </span>
            <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          </div>
        </>
      )}
    </div>
  );
}
