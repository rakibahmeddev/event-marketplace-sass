import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthTabs } from '@/components/auth/AuthTabs';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { safeNextPath } from '@/lib/auth/next-path';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const tenant = await requireTenant();
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <AuthTabs active="register" next={next === '/' ? undefined : next} />
      <h1 className="mt-1.5 font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-[32px] md:leading-10">
        Create your account
      </h1>
      <Suspense>
        <RegisterForm authTenantId={tenant.authTenantId} />
      </Suspense>
    </>
  );
}
