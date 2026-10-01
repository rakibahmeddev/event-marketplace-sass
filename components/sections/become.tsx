import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { STOCK } from '@/lib/images/stock';
import { fill } from '@/lib/pages/defaults';
import type { Section } from '@/lib/pages/schema';

/** Become-an-organizer hero (Admin → Pages → Become an organizer). The button always goes to the sign-up step. */
export function BecomeHero({
  section: s,
  marketplace,
}: {
  section: Extract<Section, { type: 'become.hero' }>;
  marketplace: string;
}) {
  return (
    <section className="bg-ink text-white">
      <div className="page-container grid items-center gap-12 py-14 md:py-[88px] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-[22px]">
          {s.eyebrow && (
            <span className="text-[13px] font-bold tracking-[0.1em] text-[#FF8E73] uppercase">
              {s.eyebrow}
            </span>
          )}
          <h1 className="font-display text-[36px] leading-[44px] font-extrabold tracking-[-0.035em] text-pretty md:text-6xl md:leading-[66px]">
            {fill(s.heading, marketplace)}
          </h1>
          {s.text && (
            <p className="max-w-[560px] text-base text-ink-muted md:text-[19px] md:leading-[30px]">
              {fill(s.text, marketplace)}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-3">
            <ButtonLink href="#register" variant="accent" size="lg">
              {s.ctaLabel}
            </ButtonLink>
          </div>
        </div>
        <div className="relative hidden h-[440px] overflow-hidden rounded-sheet bg-primary lg:block">
          <Image
            src={s.image?.url ?? STOCK.productOrganizer}
            alt={
              s.image
                ? ''
                : 'The organizer dashboard with ticket sales, next to the phone scanner checking a ticket in'
            }
            fill
            sizes="(min-width: 1280px) 600px, 50vw"
            loading="eager"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
