'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy, Field, Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { callFunction } from '@/lib/firebase/callables';
import { addStaffFormSchema } from '@/lib/validation/staff';
import { EventPicker, type PickableEvent } from './EventPicker';

type Errors = Partial<Record<'name' | 'email' | 'eventIds' | 'form', string>>;

/** Design 09 · Check-in staff → "Add scanner account". Calls the createScanner function. */
export function AddStaffForm({ authTenantId, events }: { authTenantId: string; events: PickableEvent[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState<string>();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = addStaffFormSchema.safeParse({
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      eventIds: data.getAll('eventIds').map(String),
    });
    setAdded(undefined);
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ name: f.name?.[0], email: f.email?.[0], eventIds: f.eventIds?.[0] });
      return;
    }
    setErrors({});
    setPending(true);
    const res = await callFunction(authTenantId, 'createScanner', parsed.data);
    setPending(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      return;
    }
    formRef.current?.reset();
    setAdded(parsed.data.email);
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="add-staff-title"
      className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-6"
    >
      <h2 id="add-staff-title" className="font-display text-lg font-bold">
        Add scanner account
      </h2>
      <p className="-mt-2 text-sm leading-5 text-slate-600">
        Staff can only log in to the scanner app and see the events you assign.
      </p>
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {added && (
        <Alert tone="success">
          Added. We emailed {added} a link to set their password and open the scanner.
        </Alert>
      )}
      <Field id="staff-name" label="Full name" required error={errors.name}>
        <Input
          id="staff-name"
          name="name"
          autoComplete="off"
          invalid={!!errors.name}
          aria-describedby={describedBy('staff-name', { error: errors.name })}
        />
      </Field>
      <Field id="staff-email" label="Email" required error={errors.email}>
        <Input
          id="staff-email"
          name="email"
          type="email"
          autoComplete="off"
          invalid={!!errors.email}
          aria-describedby={describedBy('staff-email', { error: errors.email })}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <span id="staff-events-label" className="text-sm font-semibold">
          Assigned events<span aria-hidden> *</span>
        </span>
        <EventPicker
          events={events}
          idPrefix="new-staff"
          describedBy={errors.eventIds ? 'staff-events-error' : 'staff-events-label'}
        />
        {errors.eventIds && (
          <p id="staff-events-error" className="text-xs text-danger">
            {errors.eventIds}
          </p>
        )}
      </div>
      <p className="text-sm text-slate-600">They’ll get an email with a link to set their password.</p>
      <Button type="submit" loading={pending} loadingText="Adding" leadingIcon={<Icon icon={faUserPlus} />}>
        Add staff member
      </Button>
    </form>
  );
}
