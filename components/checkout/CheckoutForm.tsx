'use client';

import { useCallback, useState, type FormEvent } from 'react';
import { faClock, faLock } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Choice';
import { Field, Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { cancelCheckout, submitCheckout } from '@/lib/checkout/actions';
import { useCountdown } from './Countdown';

type Seat = { key: string; ticketTypeName: string };

type Props = {
  orderId: string;
  expiresAt: number;
  eventHref: string;
  seats: Seat[];
  buyer: { name: string; email: string };
  totalLabel: string;
  isFree: boolean;
  cancelled: boolean;
};

/** Design 05 · Checkout: reservation timer, buyer + attendee details, hand-off to payment. */
export function CheckoutForm({
  orderId,
  expiresAt,
  eventHref,
  seats,
  buyer: initialBuyer,
  totalLabel,
  isFree,
  cancelled,
}: Props) {
  const [buyer, setBuyer] = useState(initialBuyer);
  const [attendees, setAttendees] = useState(
    seats.map((_, i) => (i === 0 ? { ...initialBuyer, same: true } : { name: '', email: '', same: false })),
  );
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const onExpire = useCallback(() => setTimedOut(true), []);
  const { label } = useCountdown(expiresAt, onExpire);

  const setAtt = (i: number, patch: Partial<{ name: string; email: string; same: boolean }>) =>
    setAttendees((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setFormError(undefined);
    const res = await submitCheckout({
      orderId,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      attendees: attendees.map((a) =>
        a.same ? { name: buyer.name, email: buyer.email } : { name: a.name, email: a.email },
      ),
      acceptTerms: terms,
    });
    if (res.ok) {
      window.location.assign(res.data.url); // provider-hosted page (or the local test page)
      return;
    }
    setPending(false);
    setErrors(res.fieldErrors ?? {});
    setFormError(res.error);
  }

  if (timedOut) {
    return (
      <div className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-7">
        <h2 className="type-h4">Your reservation expired</h2>
        <p className="text-slate-600">
          We held your tickets for 10 minutes. They’re back on sale — choose them again to continue.
        </p>
        <div>
          <ButtonLink href={eventHref}>Back to the event</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div
        role="timer"
        aria-live="off"
        className="flex items-center justify-center gap-3 rounded-card border border-[#F6DDB8] bg-warning-bg px-4 py-3 text-center text-[15px] text-warning-ink"
      >
        <Icon icon={faClock} />
        <span>
          Tickets reserved for{' '}
          <b className="rounded-md bg-white px-2.5 py-0.5 font-mono text-lg font-extrabold text-ink">
            {label}
          </b>
        </span>
      </div>
      {cancelled && (
        <Alert tone="info">
          Payment was cancelled. Your tickets are still reserved until the timer runs out.
        </Alert>
      )}
      {formError && <Alert tone="danger">{formError}</Alert>}

      <section className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-5 md:p-7">
        <h2 className="font-display text-xl font-bold">1. Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="b-name" label="Full name" required error={errors.buyerName}>
            <Input
              id="b-name"
              value={buyer.name}
              onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              autoComplete="name"
              invalid={!!errors.buyerName}
            />
          </Field>
          <Field
            id="b-email"
            label="Email"
            required
            hint="Tickets will be sent here"
            error={errors.buyerEmail}
          >
            <Input
              id="b-email"
              type="email"
              value={buyer.email}
              onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              autoComplete="email"
              invalid={!!errors.buyerEmail}
            />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-5 md:p-7">
        <h2 className="font-display text-xl font-bold">2. Attendee details</h2>
        {seats.map((s, i) => {
          const a = attendees[i]!;
          return (
            <div
              key={s.key}
              className="flex flex-col gap-4 rounded-[14px] border border-line-soft p-4 md:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="flex items-center gap-2.5 text-[15px]">
                  <span className="flex h-[26px] items-center rounded-full bg-primary-50 px-2.5 text-xs font-bold text-primary-hover">
                    Ticket {i + 1}
                  </span>
                  {s.ticketTypeName}
                </b>
                <Checkbox
                  label="Same as buyer"
                  checked={a.same}
                  onChange={(e) => setAtt(i, { same: e.target.checked })}
                  className="text-sm"
                />
              </div>
              {!a.same && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id={`a${i}-name`} label="Full name" required error={errors[`attendees.${i}.name`]}>
                    <Input
                      id={`a${i}-name`}
                      value={a.name}
                      onChange={(e) => setAtt(i, { name: e.target.value })}
                      invalid={!!errors[`attendees.${i}.name`]}
                    />
                  </Field>
                  <Field id={`a${i}-email`} label="Email" required error={errors[`attendees.${i}.email`]}>
                    <Input
                      id={`a${i}-email`}
                      type="email"
                      value={a.email}
                      onChange={(e) => setAtt(i, { email: e.target.value })}
                      invalid={!!errors[`attendees.${i}.email`]}
                    />
                  </Field>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-5 md:p-7">
        <h2 className="font-display text-xl font-bold">3. {isFree ? 'Confirm' : 'Payment'}</h2>
        {!isFree && (
          <p className="flex items-start gap-2 text-sm text-slate-600">
            <Icon icon={faLock} className="mt-1 text-success" />
            You’ll pay on a secure page from our payment provider. We never see or store your card details.
          </p>
        )}
        <Checkbox
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          label={
            <span className="text-sm">
              I agree to the Terms of Service and the organizer’s refund policy.
            </span>
          }
        />
        {errors.acceptTerms && <p className="text-xs text-danger">{errors.acceptTerms}</p>}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Please wait">
          {isFree ? 'Get free tickets' : `Continue to payment · ${totalLabel}`}
        </Button>
        <button
          type="button"
          className="self-center text-sm font-semibold text-slate-600 hover:text-ink"
          onClick={async () => {
            await cancelCheckout(orderId);
            window.location.assign(eventHref);
          }}
        >
          Cancel and release tickets
        </button>
      </section>
    </form>
  );
}
