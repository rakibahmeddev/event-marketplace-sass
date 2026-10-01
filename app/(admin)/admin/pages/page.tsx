import type { Metadata } from 'next';
import Link from 'next/link';
import { faArrowRight, faFileLines } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { requireRole } from '@/lib/auth/guards';
import { PAGE_META } from '@/lib/pages/fields';
import { getPageState } from '@/lib/pages/repository';
import { PAGE_IDS } from '@/lib/pages/schema';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Pages' };

/** Admin → Pages: the editable marketing pages and whether they have unpublished changes. */
export default async function AdminPagesPage() {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const states = await Promise.all(PAGE_IDS.map((p) => getPageState(tenant.id, p)));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Show, hide and reorder sections, and change the words and photos. Changes stay in a draft until you
        publish.
      </p>
      <ul className="grid gap-4 md:grid-cols-3">
        {PAGE_IDS.map((id, i) => (
          <li key={id}>
            <Link
              href={`/admin/pages/${id}`}
              className="group flex h-full flex-col gap-3 rounded-card border border-line-soft bg-white p-5 transition-shadow hover:shadow-lift focus-ring"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-lg bg-primary-50 text-primary">
                  <Icon icon={faFileLines} />
                </span>
                {states[i]!.unpublished ? (
                  <Badge tone="warning" size="md">
                    Draft changes
                  </Badge>
                ) : (
                  <Badge tone="success" size="md">
                    Published
                  </Badge>
                )}
              </div>
              <b className="font-display text-lg">{PAGE_META[id].label}</b>
              <p className="flex-1 text-sm text-slate-600">{PAGE_META[id].description}</p>
              <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                Edit page{' '}
                <Icon
                  icon={faArrowRight}
                  className="text-xs transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
