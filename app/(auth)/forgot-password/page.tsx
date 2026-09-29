import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage() {
  const tenant = await requireTenant();
  return (
    <>
      <h1 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-[32px] md:leading-10">
        Reset your password
      </h1>
      <p className="text-[15px] text-slate-600">
        Enter the email you use for your tickets and we’ll send you a reset link.
      </p>
      <ForgotPasswordForm authTenantId={tenant.authTenantId} />
    </>
  );
}
