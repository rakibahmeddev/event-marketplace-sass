import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { Card } from '@/components/ui/Card';
import { requireUser } from '@/lib/auth/guards';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Account settings' };

export default async function AccountSettingsPage() {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const usesPassword = user.signInProvider === 'password' && !!user.email;
  return (
    <div className="page-container flex max-w-[880px] flex-col gap-6 py-10 md:py-14">
      <h1 className="type-h3">Account settings</h1>
      <Card padded className="flex flex-col gap-2">
        <h2 className="type-h5">Account details</h2>
        <dl className="grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-[120px_1fr]">
          <dt className="text-slate-500">Name</dt>
          <dd>{user.name ?? '—'}</dd>
          <dt className="text-slate-500">Email</dt>
          <dd>{user.email ?? '—'}</dd>
        </dl>
        <p className="text-sm text-slate-500">
          Editing your details arrives with the rest of the account area in Phase 4.
        </p>
      </Card>
      <Card padded className="flex flex-col gap-4">
        <h2 className="type-h5">Change password</h2>
        {usesPassword ? (
          <ChangePasswordForm authTenantId={tenant.authTenantId} email={user.email!} />
        ) : (
          <p className="text-[15px] text-slate-600">
            You sign in with Google, so there’s no password to change here.
          </p>
        )}
      </Card>
    </div>
  );
}
