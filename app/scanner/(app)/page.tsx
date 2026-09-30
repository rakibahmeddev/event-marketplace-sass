import Link from 'next/link';
import { faCalendarXmark, faCamera } from '@fortawesome/free-solid-svg-icons';
import { ScannerShell } from '@/components/scanner/ScannerShell';
import { ScannerSignOut } from '@/components/scanner/ScannerSignOut';
import { Avatar } from '@/components/ui/Avatar';
import { DateBadge } from '@/components/ui/DateBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { requireUser } from '@/lib/auth/guards';
import { listScannableEvents } from '@/lib/scanner/events';
import { requireTenant } from '@/lib/tenant/current';
import { cn } from '@/lib/utils/cn';

/** Design 10 · 02 — choose which event to check people in for. */
export default async function ScannerEventsPage() {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const { events, staffName } = await listScannableEvents(user);
  const name = staffName || user.name || user.email || 'Staff';
  const noun = user.role === 'scanner' ? 'assigned to you' : 'you can scan';

  return (
    <ScannerShell tone="mist">
      <header className="flex items-center gap-3 border-b border-line-soft bg-white px-5 pt-[52px] pb-[18px] md:pt-6">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <span className="text-[13px] text-slate-500">Signed in as</span>
          <b className="block truncate text-[15px]">{name}</b>
        </div>
        <ScannerSignOut authTenantId={tenant.authTenantId} />
      </header>
      <main className="flex flex-1 flex-col gap-3 p-5">
        <h1 className="font-display text-2xl font-extrabold">Choose an event</h1>
        <p className="-mt-1.5 text-sm text-slate-600">
          {events.length} {events.length === 1 ? 'event' : 'events'} {noun}
        </p>
        {events.length === 0 && (
          <EmptyState
            icon={<Icon icon={faCalendarXmark} />}
            title="No events to scan"
            description={
              user.role === 'scanner'
                ? 'Ask the organizer to assign you to an event.'
                : 'Publish an event to start checking people in.'
            }
          />
        )}
        <ul className="flex flex-col gap-3">
          {events.map((e, i) => {
            const pct = e.ticketsIssued > 0 ? Math.min(100, (e.checkedIn / e.ticketsIssued) * 100) : 0;
            return (
              <li key={e.id}>
                <Link
                  href={`/scanner/${e.id}`}
                  className={cn(
                    'flex flex-col gap-3 rounded-card bg-white p-4 hover:border-primary focus-ring',
                    e.live || (i === 0 && !events.some((x) => x.live))
                      ? 'border-2 border-primary'
                      : 'border border-line-soft',
                  )}
                >
                  <div className="flex gap-3">
                    <DateBadge
                      month={e.month}
                      day={e.day}
                      variant={e.live ? 'filled' : 'light'}
                      className={e.live ? '' : 'bg-primary-50 shadow-none'}
                    />
                    <div className="min-w-0">
                      {e.live && (
                        <span className="inline-flex h-[22px] items-center gap-[5px] rounded-full bg-success-bg px-2 text-[11px] font-bold text-success-ink">
                          <span className="size-1.5 rounded-full bg-success" />
                          Live now
                        </span>
                      )}
                      <b className="mt-1 block font-display text-base leading-[22px] font-bold">{e.title}</b>
                      <span className="text-[13px] text-slate-600">
                        {e.venue} · {e.when}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-slate-600">Checked in</span>
                    <b>
                      {e.checkedIn} / {e.ticketsIssued}
                    </b>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${e.title} check-in progress`}
                    aria-valuemin={0}
                    aria-valuemax={e.ticketsIssued}
                    aria-valuenow={e.checkedIn}
                    className="h-2 overflow-hidden rounded-full bg-line-soft"
                  >
                    <div className="h-full bg-success" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      {events[0] && (
        <div className="p-5">
          <Link
            href={`/scanner/${(events.find((e) => e.live) ?? events[0]).id}`}
            className="flex h-14 items-center justify-center gap-2.5 rounded-input bg-primary text-[17px] font-semibold text-white hover:bg-primary-hover focus-ring"
          >
            <Icon icon={faCamera} />
            Start scanning
          </Link>
        </div>
      )}
    </ScannerShell>
  );
}
