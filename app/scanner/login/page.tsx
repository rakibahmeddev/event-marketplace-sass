import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { faQrcode } from '@fortawesome/free-solid-svg-icons';
import { DemoAccounts } from '@/components/auth/DemoAccounts';
import { LoginForm } from '@/components/auth/LoginForm';
import { ScannerShell } from '@/components/scanner/ScannerShell';
import { Icon } from '@/components/ui/Icon';
import { safeNextPath } from '@/lib/auth/next-path';
import { getSessionUser } from '@/lib/auth/session';
import { requireTenant } from '@/lib/tenant/current';
import { SEED_PASSWORD, SEED_USERS } from '@/scripts/seed-credentials';

const showDemoAccounts =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

export const metadata: Metadata = { title: 'Staff login' };

/** Design 10 · 01 — staff login. Only scanner paths are accepted as ?next=. */
export default async function ScannerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const tenant = await requireTenant();
  const next = safeNextPath((await searchParams).next);
  const target = next.startsWith('/scanner') && !next.startsWith('/scanner/login') ? next : '/scanner';
  const user = await getSessionUser();
  if (user && (user.role === 'scanner' || user.role === 'organizer')) redirect(target);

  return (
    <ScannerShell>
      <div className="flex flex-1 flex-col gap-7 px-6 pt-[72px] pb-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-[72px] place-items-center rounded-panel bg-primary text-[30px] text-white">
            <Icon icon={faQrcode} />
          </span>
          <div>
            <h1 className="font-display text-[26px] leading-[34px] font-extrabold">
              {tenant.name}
              <span className="text-accent">.</span> Scan
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">Check-in for event staff</p>
          </div>
        </div>
        {user && (
          <p className="rounded-input bg-warning-bg px-3.5 py-2.5 text-sm text-warning-ink">
            You’re signed in with an account that can’t scan tickets. Log in with a staff account.
          </p>
        )}
        {showDemoAccounts && tenant.id === 'demo' && (
          <Suspense>
            <DemoAccounts
              authTenantId={tenant.authTenantId}
              password={SEED_PASSWORD}
              accounts={[
                { email: SEED_USERS.scanner, label: 'Scanner staff', next: '/scanner' },
                { email: SEED_USERS.organizer, label: 'Organizer', next: '/scanner' },
              ]}
            />
          </Suspense>
        )}
        <Suspense>
          <LoginForm authTenantId={tenant.authTenantId} redirectTo={target} staff />
        </Suspense>
        <p className="mt-auto text-center text-[13px] leading-5 text-slate-500">
          Staff accounts are created by the organizer under Dashboard → Check-in staff.
        </p>
      </div>
    </ScannerShell>
  );
}
