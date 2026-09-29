import type { ReactNode } from 'react';
import { faTicket } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { QRCodePlaceholder } from './QRCodePlaceholder';

export type TicketCardData = {
  tenantName: string;
  eventTitle: string;
  date: string;
  time: string;
  attendeeName: string;
  ticketTypeName: string;
  venue: string;
  ticketCode: string;
  footnote: string;
};

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{label}</div>
      <b className="text-sm">{children}</b>
    </div>
  );
}

/** Digital ticket (order confirmation, My Tickets). `qr` slot receives the real QR in Phase 4. */
export function TicketCard({
  ticket,
  qr,
  notchColor = 'var(--color-mist)',
}: {
  ticket: TicketCardData;
  qr?: ReactNode;
  notchColor?: string;
}) {
  return (
    <article className="w-full max-w-[380px] overflow-hidden rounded-sheet bg-white shadow-[0_20px_50px_rgb(26_26_46/0.15)]">
      <div className="relative h-[150px]">
        <ImagePlaceholder label="event image" className="absolute inset-0" />
        <span className="absolute top-3.5 left-3.5 flex items-center gap-1.5 font-display text-sm font-extrabold text-white">
          <Icon icon={faTicket} className="-rotate-25" />
          {ticket.tenantName}.
        </span>
      </div>
      <div className="flex flex-col gap-3.5 px-6 py-5">
        <b className="font-display text-xl leading-[26px] font-extrabold">{ticket.eventTitle}</b>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Date">{ticket.date}</Field>
          <Field label="Time">{ticket.time}</Field>
          <Field label="Attendee">{ticket.attendeeName}</Field>
          <Field label="Ticket">{ticket.ticketTypeName}</Field>
          <Field label="Venue" wide>
            {ticket.venue}
          </Field>
        </div>
      </div>
      <div aria-hidden className="relative flex h-6 items-center">
        <span className="absolute -left-3 size-6 rounded-full" style={{ background: notchColor }} />
        <span className="absolute -right-3 size-6 rounded-full" style={{ background: notchColor }} />
        <span className="mx-5 flex-1 border-t-2 border-dashed border-line" />
      </div>
      <div className="flex flex-col items-center gap-3 px-6 pt-4 pb-6">
        <div className="size-[200px] rounded-[14px] border border-line-soft p-2.5">
          {qr ?? <QRCodePlaceholder />}
        </div>
        <span className="font-mono text-sm font-semibold tracking-[0.08em]">{ticket.ticketCode}</span>
        <span className="text-xs text-slate-500">{ticket.footnote}</span>
      </div>
    </article>
  );
}
