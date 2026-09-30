import type { Metadata } from 'next';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { requireRole } from '@/lib/auth/guards';
import { listCategories } from '@/lib/categories/repository';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const categories = await listCategories(tenant.id, { includeHidden: true });
  return (
    <>
      <p className="max-w-2xl text-[15px] text-slate-600">
        Categories appear on the home page, in filters and in the event editor. Hidden categories stay on
        existing events but can’t be chosen for new ones.
      </p>
      <CategoryManager categories={categories} />
    </>
  );
}
