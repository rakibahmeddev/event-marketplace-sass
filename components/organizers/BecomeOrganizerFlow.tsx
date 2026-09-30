'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';
import { ApplicationForm } from './ApplicationForm';

export type FlowState =
  | { kind: 'signed-out'; register: ReactNode }
  | {
      kind: 'apply';
      authTenantId: string;
      logoFolder: string;
      host: string;
      categories: { id: string; name: string }[];
    }
  | { kind: 'pending' }
  | { kind: 'approved' }
  | { kind: 'suspended' }
  | { kind: 'other-role' };

const STEPS = [
  ['Your account', 'Name, email, password'],
  ['Your organization', 'Public profile & category'],
  ['Payout details', 'Set up later, before your first payout'],
] as const;

function stepOf(state: FlowState['kind']): number {
  if (state === 'signed-out') return 1;
  if (state === 'apply') return 2;
  return 3;
}

/** Design 08 "Create your organizer account": step list + card. */
export function BecomeOrganizerFlow({ state }: { state: FlowState }) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const kind = submitted ? 'pending' : state.kind;
  const step = stepOf(kind);

  let body: ReactNode;
  if (kind === 'signed-out' && state.kind === 'signed-out') body = state.register;
  else if (kind === 'apply' && state.kind === 'apply')
    body = (
      <ApplicationForm
        {...state}
        onDone={() => {
          setSubmitted(true);
          router.refresh();
        }}
      />
    );
  else if (kind === 'pending')
    body = (
      <Result title="Application received" tone="success">
        A marketplace admin will review your organizer profile. Once you’re approved, log in again and your
        organizer dashboard will be ready. Payout details (Step 3) can be added before your first payout.
      </Result>
    );
  else if (kind === 'approved')
    body = (
      <Result
        title="You’re an organizer"
        tone="success"
        action={<ButtonLink href="/dashboard">Go to your dashboard</ButtonLink>}
      >
        Create your next event from the dashboard.
      </Result>
    );
  else if (kind === 'suspended')
    body = (
      <Result title="Organizer account suspended" tone="warning">
        Your organizer profile is suspended. Contact the marketplace team if you think this is a mistake.
      </Result>
    );
  else
    body = (
      <Result title="Use a separate account" tone="warning">
        This account has a staff or admin role. Log in with a different account to apply as an organizer.
      </Result>
    );

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      <div className="flex flex-col gap-[18px] lg:sticky lg:top-24">
        <h2 className="type-h2">Create your organizer account</h2>
        <p className="text-[17px] leading-[27px] text-slate-600">
          Takes about 3 minutes. A marketplace admin reviews each organizer before their first event goes
          live.
        </p>
        <ol className="mt-2 flex flex-col gap-3">
          {STEPS.map(([t, d], i) => {
            const n = i + 1;
            const done = n < step;
            const cur = n === step;
            return (
              <li key={t} className="flex items-center gap-3.5" aria-current={cur ? 'step' : undefined}>
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full text-[15px] font-bold',
                    done && 'bg-success text-white',
                    cur && 'bg-primary text-white shadow-[0_0_0_5px_var(--brand-primary-100)]',
                    !done && !cur && 'border-[1.5px] border-slate-250 text-slate-500',
                  )}
                >
                  {done ? <Icon icon={faCheck} label="Done" /> : n}
                </span>
                <div>
                  <b className="text-base">{t}</b>
                  <div className="text-[13px] text-slate-500">{d}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="flex flex-col gap-5 rounded-panel border border-line-soft bg-white p-6 shadow-[0_12px_40px_rgb(26_26_46/0.08)] md:p-9">
        <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        {body}
      </div>
    </div>
  );
}

function Result({
  title,
  tone,
  action,
  children,
}: {
  title: string;
  tone: 'success' | 'warning';
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className={cn('font-display text-2xl font-extrabold', tone === 'warning' && 'text-warning-ink')}>
        {title}
      </h3>
      <p className="text-[15px] leading-6 text-slate-600">{children}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
