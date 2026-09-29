import type { Metadata } from 'next';
import { faLock } from '@fortawesome/free-solid-svg-icons';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getSessionUser } from '@/lib/auth/session';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'No access', robots: { index: false } };

export default async function ForbiddenPage() {
  const [{ name }, user] = await Promise.all([getCurrentTenantBranding(), getSessionUser()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader tenantName={name} user={user} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="grid size-16 place-items-center rounded-panel bg-primary-50 text-2xl text-primary">
          <Icon icon={faLock} />
        </span>
        <h1 className="type-h3">You don’t have access to this page</h1>
        <p className="max-w-md text-[15px] text-slate-600">
          This area is for a different type of account. If you think this is a mistake, contact the
          marketplace team.
        </p>
        <ButtonLink href="/">Back to home</ButtonLink>
      </main>
    </div>
  );
}
