import type { Metadata } from 'next';
import { AddStaffForm } from '@/components/dashboard/staff/AddStaffForm';
import { StaffActiveSwitch, StaffEvents } from '@/components/dashboard/staff/StaffControls';
import { initials } from '@/components/ui/Avatar';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { listOrganizerEvents } from '@/lib/events/repository';
import { eventDateLabels } from '@/lib/format/time';
import { requireOrganizer } from '@/lib/organizers/context';
import { listStaff } from '@/lib/scanner/staff';

export const metadata: Metadata = { title: 'Check-in staff' };

export default async function StaffPage() {
  const { tenant, organizer } = await requireOrganizer();
  const [events, staff] = await Promise.all([
    listOrganizerEvents(tenant.id, organizer.id),
    listStaff(tenant.id, organizer.id),
  ]);
  const pickable = events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => ({
      id: e.id,
      label:
        e.startAt && e.endAt
          ? `${e.title} · ${eventDateLabels(e.startAt, e.endAt, e.timezone).short.split(' · ')[0]}`
          : e.title,
    }));
  const lastFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tenant.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="max-w-xl 2xl:max-w-none">
        {pickable.length > 0 ? (
          <AddStaffForm authTenantId={tenant.authTenantId} events={pickable} />
        ) : (
          <div className="rounded-card border border-line-soft bg-white p-6 text-sm text-slate-600">
            Create an event first, then add staff to scan its tickets.
          </div>
        )}
      </div>
      <section aria-labelledby="staff-list-title" className="flex flex-col gap-3">
        <h2 id="staff-list-title" className="font-display text-lg font-bold">
          Check-in staff ({staff.length})
        </h2>
        {staff.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-strong bg-white p-6 text-sm text-slate-600">
            No staff yet. You can also scan tickets yourself at <b>/scanner</b> with your organizer login.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Staff</TH>
                <TH>Assigned events</TH>
                <TH>Activity</TH>
                <TH>Active</TH>
              </tr>
            </THead>
            <TBody>
              {staff.map((s) => (
                <TR key={s.uid} data-staff={s.email}>
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                        {initials(s.name) || '?'}
                      </span>
                      <span className="min-w-0">
                        <b className="block">{s.name}</b>
                        <span className="text-xs text-slate-500">{s.email}</span>
                      </span>
                    </span>
                  </TD>
                  <TD>
                    <StaffEvents
                      authTenantId={tenant.authTenantId}
                      uid={s.uid}
                      eventIds={s.eventIds}
                      events={pickable}
                    />
                  </TD>
                  <TD className="whitespace-nowrap">
                    <b className="block">
                      {s.scanCount} {s.scanCount === 1 ? 'scan' : 'scans'}
                    </b>
                    <span className="text-xs text-slate-500">
                      {s.lastScanAt ? `Last ${lastFmt.format(s.lastScanAt)}` : 'Not used yet'}
                    </span>
                  </TD>
                  <TD>
                    <StaffActiveSwitch
                      authTenantId={tenant.authTenantId}
                      uid={s.uid}
                      name={s.name}
                      active={s.active}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}
