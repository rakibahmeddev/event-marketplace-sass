'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';

const TOPICS = ['My tickets', 'Refunds', 'Organizer account', 'Something else'];

/**
 * Design 11 contact form. Until the email provider is connected (Phase 4) it opens the visitor's
 * email app with the message pre-filled — nothing is sent to or stored on our servers.
 */
export function ContactForm({ supportEmail }: { supportEmail: string | null }) {
  const [error, setError] = useState<string>();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supportEmail) return;
    const d = new FormData(e.currentTarget);
    const message = String(d.get('message') ?? '').trim();
    if (!message) return setError('Write a message first.');
    setError(undefined);
    const order = String(d.get('order') ?? '').trim();
    const subject = `${d.get('topic')}${order ? ` · Order ${order}` : ''}`;
    const body = `${message}\n\n— ${String(d.get('name') ?? '').trim()}`;
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-panel border border-line-soft bg-white p-6 md:p-9"
    >
      <h2 className="font-display text-[22px] font-extrabold">Send us a message</h2>
      {!supportEmail && (
        <Alert tone="warning">This marketplace hasn’t published a support address yet.</Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="c-name" label="Name">
          <Input id="c-name" name="name" placeholder="Your name" autoComplete="name" />
        </Field>
        <Field id="c-topic" label="Topic">
          <Select id="c-topic" name="topic" defaultValue={TOPICS[0]}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="c-order" label="Order number (optional)">
        <Input id="c-order" name="order" placeholder="#10482" />
      </Field>
      <Field id="c-message" label="Message">
        <Textarea id="c-message" name="message" rows={6} placeholder="How can we help?" />
      </Field>
      <div>
        <Button type="submit" size="lg" disabled={!supportEmail}>
          Open in my email app
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        Your message opens in your own email app, addressed to {supportEmail ?? 'our support team'}.
      </p>
    </form>
  );
}
