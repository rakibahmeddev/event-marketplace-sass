import type { Metadata } from 'next';
import { AboutSection } from '@/components/sections/about';
import { PreviewBanner } from '@/components/sections/PreviewBanner';
import { getPublicSections } from '@/lib/pages/repository';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'About us' };

/** Content from Admin → Pages → About (built-in defaults until published). */
export default async function AboutPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const tenant = await requireTenant();
  const { sections, preview } = await getPublicSections(tenant.id, 'about', (await searchParams).preview);
  return (
    <>
      {preview && <PreviewBanner editHref="/admin/pages/about" />}
      {sections
        .filter((s) => s.enabled)
        .map((s) => (
          <AboutSection key={s.type} section={s} marketplace={tenant.name} />
        ))}
    </>
  );
}
