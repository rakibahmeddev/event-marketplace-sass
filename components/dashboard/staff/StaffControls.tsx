'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Choice';
import { callFunction } from '@/lib/firebase/callables';
import { EventPicker, type PickableEvent } from './EventPicker';

/** Turning staff off disables their sign-in and ends their sessions (updateScanner function). */
export function StaffActiveSwitch({
  authTenantId,
  uid,
  name,
  active,
}: {
  authTenantId: string;
  uid: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function toggle(next: boolean) {
    setOn(next);
    setPending(true);
    setError(undefined);
    const res = await callFunction(authTenantId, 'updateScanner', { uid, active: next });
    setPending(false);
    if (!res.ok) {
      setOn(!next);
      setError(res.error);
    } else router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Switch
        checked={on}
        disabled={pending}
        onChange={(e) => toggle(e.currentTarget.checked)}
        aria-label={`${name} can scan`}
        label={<span className="sr-only">{on ? 'Active' : 'Off'}</span>}
      />
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

/** Assigned events cell: labels, with an inline editor. */
export function StaffEvents({
  authTenantId,
  uid,
  eventIds,
  events,
}: {
  authTenantId: string;
  uid: string;
  eventIds: string[];
  events: PickableEvent[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const labels = new Map(events.map((e) => [e.id, e.label]));
  const names = eventIds.map((id) => labels.get(id) ?? 'Removed event');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ids = new FormData(e.currentTarget).getAll('eventIds').map(String);
    if (ids.length === 0) {
      setError('Choose at least one event, or turn the account off.');
      return;
    }
    setPending(true);
    setError(undefined);
    const res = await callFunction(authTenantId, 'updateScanner', { uid, eventIds: ids });
    setPending(false);
    if (!res.ok) setError(res.error);
    else {
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-col items-start gap-1">
        <ul className="flex max-w-[260px] flex-col text-slate-600">
          {names.length === 0 && <li>—</li>}
          {names.map((n, i) => (
            <li key={i} className="truncate" title={n}>
              {n}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-semibold text-primary hover:text-primary-hover focus-ring"
        >
          Change events
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={save} className="flex min-w-[240px] flex-col gap-2">
      <EventPicker events={events} selected={eventIds} idPrefix={`edit-${uid}`} />
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
