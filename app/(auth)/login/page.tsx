import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { DemoAccounts } from '@/components/auth/DemoAccounts';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeNextPath } from '@/lib/auth/next-path';
import { requireTenant } from '@/lib/tenant/current';
import { SEED_PASSWORD, SEED_USERS } from '@/scripts/seed-credentials';

// Only when running against the local emulators — never in production builds.
const showDemoAccounts =
  process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const tenant = await requireTenant();
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <AuthTabs active="login" next={next === '/' ? undefined : next} />
      <h1 className="mt-2.5 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-[32px] md:leading-10">
        Welcome back
      </h1>
      {showDemoAccounts && tenant.id === 'demo' && (
        <Suspense>
          <DemoAccounts
            authTenantId={tenant.authTenantId}
            password={SEED_PASSWORD}
            accounts={[
              { email: SEED_USERS.admin, label: 'Tenant admin', next: '/admin' },
              { email: SEED_USERS.organizer, label: 'Organizer', next: '/dashboard/events' },
              { email: SEED_USERS.attendee, label: 'Attendee', next: '/account/tickets' },
              { email: SEED_USERS.applicant, label: 'Applicant (pending)', next: '/become-an-organizer' },
            ]}
          />
        </Suspense>
      )}
      <Suspense>
        <LoginForm authTenantId={tenant.authTenantId} />
      </Suspense>
    </>
  );
}
