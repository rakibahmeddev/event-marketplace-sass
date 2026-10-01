import { HomeSection } from '@/components/sections/home';
import { PreviewBanner } from '@/components/sections/PreviewBanner';
import { getHomeData } from '@/lib/events/discovery';
import { getPublicSections } from '@/lib/pages/repository';
import { requireTenant } from '@/lib/tenant/current';

// Always fresh: event lists change as organizers publish.
export const dynamic = 'force-dynamic';

/** Sections, their order and copy come from Admin → Pages → Home (built-in defaults until published). */
export default async function HomePage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const tenant = await requireTenant();
  const [data, { sections, preview }] = await Promise.all([
    getHomeData(tenant),
    searchParams.then((sp) => getPublicSections(tenant.id, 'home', sp.preview)),
  ]);
  return (
    <>
      {preview && <PreviewBanner editHref="/admin/pages/home" />}
      {sections
        .filter((s) => s.enabled)
        .map((s) => (
          <HomeSection key={s.type} section={s} data={data} marketplace={tenant.name} />
        ))}
    </>
  );
}
