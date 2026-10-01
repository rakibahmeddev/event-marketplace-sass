import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { faArrowLeft, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { PageEditor } from '@/components/admin/pages/PageEditor';
import { Icon } from '@/components/ui/Icon';
import { requireRole } from '@/lib/auth/guards';
import { PAGE_META } from '@/lib/pages/fields';
import { getPageState } from '@/lib/pages/repository';
import { PAGE_IDS, type PageId } from '@/lib/pages/schema';
import { storagePaths } from '@/lib/storage/server';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Edit page' };

export default async function EditMarketingPage({ params }: { params: Promise<{ page: string }> }) {
  const [{ page }, , tenant] = await Promise.all([params, requireRole('tenant_admin'), requireTenant()]);
  if (!(PAGE_IDS as readonly string[]).includes(page)) notFound();
  const id = page as PageId;
  const state = await getPageState(tenant.id, id);
  const meta = PAGE_META[id];
  const published = state.publishedAt
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: tenant.timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(state.publishedAt)
    : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/pages"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-ink"
          >
            <Icon icon={faArrowLeft} className="text-xs" />
            All pages
          </Link>
          <h1 className="type-h4">{meta.label}</h1>
        </div>
        <a
          href={meta.path}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          View live page <Icon icon={faArrowUpRightFromSquare} className="text-xs" />
        </a>
      </div>
      <PageEditor
        page={id}
        publicPath={meta.path}
        initial={state.draft}
        unpublished={state.unpublished}
        publishedLabel={published}
        authTenantId={tenant.authTenantId}
        imageFolder={storagePaths.brandingLogo(tenant.id)}
      />
    </>
  );
}
