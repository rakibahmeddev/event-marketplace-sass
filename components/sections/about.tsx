import Image from 'next/image';
import { faHandHoldingHeart, faScaleBalanced, faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { STOCK } from '@/lib/images/stock';
import { fill } from '@/lib/pages/defaults';
import type { Section } from '@/lib/pages/schema';
import { StatsSection } from './Stats';

const valueIcons = [faScaleBalanced, faHandHoldingHeart, faShieldHalved];

/** One About-page section (Admin → Pages → About). */
export function AboutSection({ section: s, marketplace }: { section: Section; marketplace: string }) {
  switch (s.type) {
    case 'about.hero':
      return (
        <>
          <section className="page-container grid items-end gap-6 pt-9 pb-8 md:gap-12 md:pt-[88px] md:pb-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="flex flex-col gap-4 md:gap-[18px]">
              {s.eyebrow && (
                <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase md:text-[13px]">
                  {s.eyebrow}
                </span>
              )}
              <h1 className="font-display text-[32px] leading-10 font-extrabold tracking-[-0.03em] text-pretty md:text-[56px] md:leading-[64px]">
                {fill(s.heading, marketplace)}
              </h1>
            </div>
            {s.text && (
              <p className="text-base leading-[25px] text-slate-600 md:text-lg md:leading-7">
                {fill(s.text, marketplace)}
              </p>
            )}
          </section>
          <div className="page-container">
            <div className="relative h-[220px] overflow-hidden rounded-card bg-ink md:h-[420px] md:rounded-sheet">
              <Image
                src={s.image?.url ?? STOCK.aboutCommunity}
                alt=""
                fill
                sizes="(min-width: 1280px) 1216px, 100vw"
                loading="eager"
                className="object-cover"
              />
            </div>
          </div>
        </>
      );
    case 'about.values':
      return (
        <section className="mt-14 bg-mist md:mt-[72px]">
          <div className="page-container grid gap-6 py-14 md:grid-cols-3 md:py-[72px]">
            {s.items.map((v, i) => (
              <div key={i} className="flex flex-col gap-2.5 rounded-card bg-white p-7">
                <Icon icon={valueIcons[i] ?? faScaleBalanced} className="text-[22px] text-primary" />
                <b className="font-display text-xl font-bold">{v.title}</b>
                <span className="text-[15px] leading-6 text-slate-600">{fill(v.text, marketplace)}</span>
              </div>
            ))}
          </div>
        </section>
      );
    case 'stats':
      return <StatsSection section={s} />;
    default:
      return null;
  }
}
