'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowUpRightFromSquare,
  faCircleCheck,
  faPlus,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload, type UploadedImage } from '@/components/ui/ImageUpload';
import { changeEventStatus, saveEvent } from '@/lib/events/actions';
import type { EventStatus } from '@/lib/events/schema';
import { parseMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils/cn';

export type TicketRow = {
  key: string;
  id?: string;
  name: string;
  price: string;
  quantity: string;
  salesEndDate: string;
  salesEndTime: string;
  /** Sold + reserved (existing types only). Locks price and sets the minimum quantity. */
  committed: number;
};

export type EditorValues = {
  title: string;
  category: string;
  description: string;
  isOnline: boolean;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  venueCountry: string;
  timezone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  refundPolicy: string;
  images: UploadedImage[];
  tickets: TicketRow[];
};

type Props = {
  eventId: string;
  initial: EditorValues;
  status: EventStatus | 'new';
  slug: string | null;
  totalSold: number;
  currency: string;
  categories: { id: string; name: string }[];
  timezones: string[];
  authTenantId: string;
  imageFolder: string;
  /** Result of the previous save, carried across the redirect after creating an event. */
  savedNotice?: 'published' | 'saved';
};

let rowSeq = 0;
const newRow = (): TicketRow => ({
  key: `n${++rowSeq}`,
  name: '',
  price: '',
  quantity: '',
  salesEndDate: '',
  salesEndTime: '',
  committed: 0,
});

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Design 09 · Create event. All server-owned fields (status, sold, totals…) are computed by `saveEvent`. */
export function EventEditor({
  eventId,
  initial,
  status,
  slug,
  totalSold,
  currency,
  categories,
  timezones,
  authTenantId,
  imageFolder,
  savedNotice,
}: Props) {
  const router = useRouter();
  const [v, setV] = useState<EditorValues>(
    initial.tickets.length ? initial : { ...initial, tickets: [newRow()] },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    savedNotice
      ? { tone: 'success', text: savedNotice === 'published' ? 'Published! Your event is live.' : 'Saved.' }
      : null,
  );
  const [pending, setPending] = useState<'save' | 'publish' | 'status' | null>(null);
  const locked = status === 'cancelled';

  const set = <K extends keyof EditorValues>(k: K, value: EditorValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));
  const setTicket = (key: string, patch: Partial<TicketRow>) =>
    setV((s) => ({ ...s, tickets: s.tickets.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));

  const checklist = useMemo(
    () => [
      { label: 'Title & category', ok: v.title.trim().length >= 3 && !!v.category },
      { label: 'Cover image', ok: v.images.length > 0 },
      {
        label: 'Date & venue',
        ok:
          !!(v.startDate && v.startTime && v.endDate && v.endTime) &&
          (v.isOnline || !!(v.venueName && v.venueCity)),
      },
      { label: 'Ticket types', ok: v.tickets.some((t) => t.name && t.quantity) },
      { label: 'Refund policy (recommended)', ok: v.refundPolicy.trim().length > 0 },
    ],
    [v],
  );
  const capacity = v.tickets.reduce((n, t) => n + (Number.parseInt(t.quantity, 10) || 0), 0);

  async function submit(intent: 'save' | 'publish') {
    setMessage(null);
    const clientErrors: Record<string, string> = {};
    const tickets = v.tickets
      .filter((t) => t.id || t.name || t.price || t.quantity)
      .map((t, i) => {
        const price = t.price.trim() === '' ? 0 : parseMoney(t.price, currency);
        const quantity = Number(t.quantity);
        if (price === null) clientErrors[`ticketTypes.${i}.price`] = 'Enter an amount like 45 or 12.50';
        if (!Number.isInteger(quantity) || quantity < 1)
          clientErrors[`ticketTypes.${i}.quantity`] = 'At least 1';
        return {
          ...(t.id ? { id: t.id } : {}),
          name: t.name,
          description: '',
          price: price ?? -1,
          quantity: Number.isInteger(quantity) ? quantity : 0,
          salesStartDate: '',
          salesStartTime: '',
          salesEndDate: t.salesEndDate,
          salesEndTime: t.salesEndTime,
        };
      });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      setMessage({ tone: 'danger', text: 'Check the highlighted fields.' });
      return;
    }
    setPending(intent);
    const res = await saveEvent(
      eventId,
      {
        title: v.title,
        category: v.category || null,
        description: v.description,
        isOnline: v.isOnline,
        venueName: v.venueName,
        venueAddress: v.venueAddress,
        venueCity: v.venueCity,
        venueCountry: v.venueCountry,
        timezone: v.timezone,
        startDate: v.startDate,
        startTime: v.startTime,
        endDate: v.endDate,
        endTime: v.endTime,
        refundPolicy: v.refundPolicy,
        imagePaths: v.images.map((i) => i.path),
        ticketTypes: tickets,
      },
      intent,
    );
    setPending(null);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      setMessage({ tone: 'danger', text: res.error });
      return;
    }
    setErrors({});
    setMessage({ tone: 'success', text: intent === 'publish' ? 'Published! Your event is live.' : 'Saved.' });
    if (status === 'new')
      router.replace(`/dashboard/events/${eventId}?saved=${intent === 'publish' ? 'published' : 'saved'}`);
    else router.refresh();
  }

  async function statusAction(action: 'unpublish' | 'cancel') {
    if (
      action === 'cancel' &&
      !window.confirm(
        'Cancel this event? It stays visible with a cancellation notice and can’t be re-opened.',
      )
    )
      return;
    setPending('status');
    const res = await changeEventStatus(eventId, action);
    setPending(null);
    if (!res.ok) setMessage({ tone: 'danger', text: res.error });
    else router.refresh();
  }

  const e = (k: string) => errors[k];
  const statusTone = { new: 'warning', draft: 'warning', published: 'success', cancelled: 'danger' } as const;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={locked} className="flex min-w-0 flex-col gap-5">
        <Card title="Basic info">
          <Field id="ev-title" label="Event title" required error={e('title')}>
            <Input
              id="ev-title"
              value={v.title}
              onChange={(x) => set('title', x.target.value)}
              invalid={!!e('title')}
              maxLength={120}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ev-category" label="Category" required error={e('category')}>
              <Select id="ev-category" value={v.category} onChange={(x) => set('category', x.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">Event type</span>
              <div
                role="radiogroup"
                aria-label="Event type"
                className="grid h-12 grid-cols-2 overflow-hidden rounded-input border-[1.5px] border-line-strong text-sm font-semibold"
              >
                {[false, true].map((online) => (
                  <button
                    key={String(online)}
                    type="button"
                    role="radio"
                    aria-checked={v.isOnline === online}
                    onClick={() => set('isOnline', online)}
                    className={cn(
                      'focus-ring',
                      online && 'border-l-[1.5px] border-line-strong',
                      v.isOnline === online ? 'bg-primary-50 text-primary-hover' : 'hover:bg-mist',
                    )}
                  >
                    {online ? 'Online' : 'In-person'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Images">
          <ImageUpload
            authTenantId={authTenantId}
            folder={imageFolder}
            value={v.images}
            onChange={(imgs) => set('images', imgs)}
            max={6}
            label="Cover and gallery"
            hint="The first image is the cover (1600×900 works best). Up to 6 images, 5 MB each."
            error={e('imagePaths')}
          />
        </Card>

        <Card title="Date, time & venue">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="ev-start-date" label="Start date" error={e('startDate')}>
              <Input
                id="ev-start-date"
                type="date"
                value={v.startDate}
                onChange={(x) => set('startDate', x.target.value)}
                invalid={!!e('startDate')}
              />
            </Field>
            <Field id="ev-start-time" label="Start time">
              <Input
                id="ev-start-time"
                type="time"
                value={v.startTime}
                onChange={(x) => set('startTime', x.target.value)}
              />
            </Field>
            <Field id="ev-end-date" label="End date" error={e('endDate')}>
              <Input
                id="ev-end-date"
                type="date"
                value={v.endDate}
                onChange={(x) => set('endDate', x.target.value)}
                invalid={!!e('endDate')}
              />
            </Field>
            <Field id="ev-end-time" label="End time">
              <Input
                id="ev-end-time"
                type="time"
                value={v.endTime}
                onChange={(x) => set('endTime', x.target.value)}
              />
            </Field>
          </div>
          <Field id="ev-tz" label="Timezone" hint="Times above are in this timezone." error={e('timezone')}>
            <Select id="ev-tz" value={v.timezone} onChange={(x) => set('timezone', x.target.value)}>
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Field>
          {!v.isOnline && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ev-venue" label="Venue name" error={e('venueName')}>
                <Input id="ev-venue" value={v.venueName} onChange={(x) => set('venueName', x.target.value)} />
              </Field>
              <Field id="ev-address" label="Address">
                <Input
                  id="ev-address"
                  value={v.venueAddress}
                  onChange={(x) => set('venueAddress', x.target.value)}
                  autoComplete="street-address"
                />
              </Field>
              <Field id="ev-city" label="City" error={e('venueCity')}>
                <Input
                  id="ev-city"
                  value={v.venueCity}
                  onChange={(x) => set('venueCity', x.target.value)}
                  autoComplete="address-level2"
                />
              </Field>
              <Field id="ev-country" label="Country">
                <Input
                  id="ev-country"
                  value={v.venueCountry}
                  onChange={(x) => set('venueCountry', x.target.value)}
                  autoComplete="country-name"
                />
              </Field>
            </div>
          )}
        </Card>

        <Card title="Description">
          <Field
            id="ev-desc"
            label="About this event"
            hint="Plain text. Leave a blank line between paragraphs."
            error={e('description')}
          >
            <Textarea
              id="ev-desc"
              rows={8}
              value={v.description}
              onChange={(x) => set('description', x.target.value)}
              maxLength={8000}
            />
          </Field>
          <Field id="ev-refunds" label="Refund policy" error={e('refundPolicy')}>
            <Textarea
              id="ev-refunds"
              rows={3}
              value={v.refundPolicy}
              onChange={(x) => set('refundPolicy', x.target.value)}
              maxLength={2000}
            />
          </Field>
        </Card>

        <Card
          title="Ticket types"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="bg-primary-50"
              leadingIcon={<Icon icon={faPlus} className="text-xs" />}
              onClick={() => set('tickets', [...v.tickets, newRow()])}
              disabled={v.tickets.length >= 20}
            >
              Add ticket type
            </Button>
          }
        >
          {e('ticketTypes') && <Alert tone="danger">{e('ticketTypes')}</Alert>}
          <div className="hidden grid-cols-[minmax(0,1fr)_112px_96px_40px] gap-3 px-1 text-xs font-semibold tracking-[0.06em] text-slate-500 uppercase md:grid">
            <span>Name</span>
            <span>Price ({currency})</span>
            <span>Quantity</span>
            <span />
          </div>
          <ul className="flex flex-col gap-4 md:gap-3">
            {v.tickets.map((t, i) => (
              <li
                key={t.key}
                className="grid gap-2 rounded-lg border border-line-soft p-3 md:grid-cols-[minmax(0,1fr)_112px_96px_40px] md:items-start md:gap-x-3 md:gap-y-2"
              >
                <TicketInput label="Name" error={e(`ticketTypes.${i}.name`)}>
                  <Input
                    aria-label={`Ticket ${i + 1} name`}
                    value={t.name}
                    placeholder="General Admission"
                    onChange={(x) => setTicket(t.key, { name: x.target.value })}
                    invalid={!!e(`ticketTypes.${i}.name`)}
                  />
                </TicketInput>
                <TicketInput
                  label="Price"
                  error={e(`ticketTypes.${i}.price`)}
                  note={t.committed > 0 ? 'Locked' : undefined}
                >
                  <Input
                    aria-label={`Ticket ${i + 1} price`}
                    inputMode="decimal"
                    value={t.price}
                    placeholder="0 = free"
                    disabled={t.committed > 0}
                    onChange={(x) => setTicket(t.key, { price: x.target.value })}
                    invalid={!!e(`ticketTypes.${i}.price`)}
                  />
                </TicketInput>
                <TicketInput
                  label="Quantity"
                  error={e(`ticketTypes.${i}.quantity`)}
                  note={t.committed > 0 ? `${t.committed} sold` : undefined}
                >
                  <Input
                    aria-label={`Ticket ${i + 1} quantity`}
                    inputMode="numeric"
                    value={t.quantity}
                    onChange={(x) => setTicket(t.key, { quantity: x.target.value.replace(/\D/g, '') })}
                    invalid={!!e(`ticketTypes.${i}.quantity`)}
                  />
                </TicketInput>

                <button
                  type="button"
                  aria-label={`Remove ticket ${i + 1}`}
                  disabled={t.committed > 0}
                  title={t.committed > 0 ? 'Tickets have been sold — reduce the quantity instead' : undefined}
                  onClick={() =>
                    set(
                      'tickets',
                      v.tickets.filter((x) => x.key !== t.key),
                    )
                  }
                  className="grid size-10 place-items-center justify-self-end rounded-input text-danger hover:bg-danger-bg disabled:text-slate-300 disabled:hover:bg-transparent focus-ring md:mt-1"
                >
                  <Icon icon={faTrashCan} />
                </button>
                <TicketInput label="Sales end (optional)" wide error={e(`ticketTypes.${i}.salesEndDate`)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="hidden text-xs font-semibold text-slate-500 md:inline">
                      Sales end (optional)
                    </span>
                    <div className="grid grid-cols-[minmax(0,170px)_minmax(0,130px)] gap-2">
                      <Input
                        aria-label={`Ticket ${i + 1} sales end date`}
                        type="date"
                        value={t.salesEndDate}
                        onChange={(x) => setTicket(t.key, { salesEndDate: x.target.value })}
                        className="h-10"
                      />
                      <Input
                        aria-label={`Ticket ${i + 1} sales end time`}
                        type="time"
                        value={t.salesEndTime}
                        onChange={(x) => setTicket(t.key, { salesEndTime: x.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                </TicketInput>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Leave sales end empty to stop sales when the event starts. Fees are added at checkout.
          </p>
        </Card>
      </fieldset>

      <div className="flex flex-col gap-5 xl:sticky xl:top-6">
        <section className="flex flex-col gap-3.5 rounded-card border border-line-soft bg-white p-5">
          <h2 className="font-display text-base font-bold">Publish</h2>
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Status</span>
            <Badge tone={statusTone[status]} size="md">
              {status === 'new' ? 'New' : status[0]!.toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Visibility</span>
            <b>Public</b>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Capacity</span>
            <b>{capacity.toLocaleString('en-US')}</b>
          </div>
          {!locked && status !== 'published' && (
            <Button
              onClick={() => submit('publish')}
              loading={pending === 'publish'}
              loadingText="Publishing"
              disabled={!!pending}
            >
              Publish event
            </Button>
          )}
          {!locked && (
            <Button
              variant="secondary"
              size="sm"
              className="h-11"
              onClick={() => submit('save')}
              loading={pending === 'save'}
              loadingText="Saving"
              disabled={!!pending}
            >
              {status === 'published' ? 'Save changes' : 'Save draft'}
            </Button>
          )}
          {slug && status !== 'new' && (
            <Link
              href={`/events/${slug}`}
              target="_blank"
              className="flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {status === 'published' || status === 'cancelled'
                ? 'View event page'
                : 'Public page (after publishing)'}
              <Icon icon={faArrowUpRightFromSquare} className="text-xs" />
            </Link>
          )}
          {status === 'published' && (
            <div className="flex flex-col gap-2 border-t border-line-soft pt-3">
              {totalSold === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => statusAction('unpublish')}
                  disabled={!!pending}
                >
                  Unpublish
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:bg-danger-bg hover:text-danger"
                onClick={() => statusAction('cancel')}
                disabled={!!pending}
              >
                Cancel event
              </Button>
            </div>
          )}
        </section>
        <section className="flex flex-col gap-2.5 rounded-card border border-line-soft bg-white p-5 text-sm">
          <h2 className="font-display text-base font-bold">Checklist</h2>
          <ul className="flex flex-col gap-2.5">
            {checklist.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <Icon
                  icon={c.ok ? faCircleCheck : faCircle}
                  className={c.ok ? 'text-success' : 'text-slate-250'}
                />
                {c.label}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function TicketInput({
  label,
  error,
  note,
  wide,
  children,
}: {
  label: string;
  error?: string;
  note?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1', wide && 'md:col-span-4')}>
      <span className="text-xs font-semibold text-slate-500 md:hidden">{label}</span>
      {children}
      {(error || note) && (
        <span className={cn('text-xs', error ? 'text-danger' : 'text-slate-500')}>{error ?? note}</span>
      )}
    </div>
  );
}
