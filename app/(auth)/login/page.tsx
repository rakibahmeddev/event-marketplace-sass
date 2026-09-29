import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { LoginForm } from '@/components/auth/LoginForm';
import { safeNextPath } from '@/lib/auth/next-path';
import { requireTenant } from '@/lib/tenant/current';

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
      <Suspense>
        <LoginForm authTenantId={tenant.authTenantId} />
      </Suspense>
    </>
  );
}
