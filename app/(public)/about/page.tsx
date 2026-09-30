import type { Metadata } from 'next';
import { faHandHoldingHeart, faScaleBalanced, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'About us' };

const values = [
  {
    icon: faScaleBalanced,
    t: 'Fair by default',
    d: 'One clear fee, shown upfront. No surprise charges at checkout.',
  },
  {
    icon: faHandHoldingHeart,
    t: 'Organizers first',
    d: 'The tools big promoters have, sized for a Tuesday night workshop.',
  },
  {
    icon: faShieldHalved,
    t: 'Safe to buy',
    d: 'Reviewed organizers, secure card payments and tickets you can check anytime in your account.',
  },
];

// Marketplace statistics from the design are hidden until the tenant provides real numbers (Phase 6).
export default async function AboutPage() {
  const tenant = await requireTenant();
  return (
    <>
      <section className="page-container grid items-end gap-6 pt-9 pb-8 md:gap-12 md:pt-[88px] md:pb-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase md:text-[13px]">
            About us
          </span>
          <h1 className="font-display text-[32px] leading-10 font-extrabold tracking-[-0.03em] text-pretty md:text-[56px] md:leading-[64px]">
            We help people show up for the things they love.
          </h1>
        </div>
        <p className="text-base leading-[25px] text-slate-600 md:text-lg md:leading-7">
          {tenant.name} is a marketplace where independent organizers sell tickets directly to their community
          — with fair fees and instant QR tickets.
        </p>
      </section>
      <div className="page-container">
        <div className="grid h-[220px] place-items-center rounded-card img-placeholder md:h-[420px] md:rounded-sheet">
          <span aria-hidden className="font-mono text-[11px] text-[#9C94BF]">
            [ team / community event photo ]
          </span>
        </div>
      </div>
      <section className="mt-14 bg-mist md:mt-[72px]">
        <div className="page-container grid gap-6 py-14 md:grid-cols-3 md:py-[72px]">
          {values.map((v) => (
            <div key={v.t} className="flex flex-col gap-2.5 rounded-card bg-white p-7">
              <Icon icon={v.icon} className="text-[22px] text-primary" />
              <b className="font-display text-xl font-bold">{v.t}</b>
              <span className="text-[15px] leading-6 text-slate-600">{v.d}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
