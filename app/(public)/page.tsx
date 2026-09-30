import Image from 'next/image';
import Link from 'next/link';
import {
  faArrowRight,
  faBolt,
  faCreditCard,
  faMagnifyingGlass,
  faQrcode,
  faTicket,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { CategoryTile } from '@/components/events/CategoryTile';
import { categoryIcons } from '@/components/events/categoryIcons';
import { CityTile } from '@/components/events/CityTile';
import { EventCard } from '@/components/events/EventCard';
import { HeroSearch } from '@/components/home/HeroSearch';
import { Section } from '@/components/home/Section';
import { OrganizerCard } from '@/components/organizers/OrganizerCard';
import { ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { getHomeData } from '@/lib/events/discovery';
import { STOCK } from '@/lib/images/stock';
import { requireTenant } from '@/lib/tenant/current';

// Always fresh: event lists change as organizers publish.
export const dynamic = 'force-dynamic';

const steps = [
  {
    icon: faMagnifyingGlass,
    title: 'Discover',
    text: 'Search by city, date or vibe and find something worth leaving the house for.',
  },
  {
    icon: faCreditCard,
    title: 'Book securely',
    text: 'Pay by card. Your tickets are held for 10 minutes while you check out.',
  },
  {
    icon: faQrcode,
    title: 'Scan & enjoy',
    text: 'Your QR ticket arrives by email and in your account. Show it at the door.',
  },
];

const organizerPerks = [
  { icon: faWandMagicSparkles, title: 'Easy setup', text: 'Publish your first event in minutes.' },
  { icon: faQrcode, title: 'QR check-in', text: 'Free scanner for your door staff.' },
  { icon: faBolt, title: 'Clear fees', text: 'One transparent fee, shown upfront.' },
];

export default async function HomePage() {
  const tenant = await requireTenant();
  const data = await getHomeData(tenant);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[520px] items-center overflow-hidden bg-ink md:min-h-[600px]">
        <Image
          src={STOCK.hero}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(26_26_46/0.92)_0%,rgb(26_26_46/0.55)_60%,rgb(26_26_46/0.2)_100%)]" />
        <div className="page-container relative flex flex-col gap-6 py-14">
          {data.totalUpcoming > 0 && (
            <span className="flex h-8 items-center gap-2 self-start rounded-full bg-white/12 px-3.5 text-[13px] font-semibold text-white">
              <span className="size-2 rounded-full bg-accent" />
              {data.totalUpcoming} upcoming event{data.totalUpcoming === 1 ? '' : 's'}
            </span>
          )}
          <h1 className="max-w-[760px] font-display text-[36px] leading-[44px] font-extrabold tracking-[-0.035em] text-pretty text-white md:text-[64px] md:leading-[70px]">
            Find the nights you’ll talk about for years.
          </h1>
          <p className="max-w-[560px] text-base text-[#D9D6E8] md:text-[19px] md:leading-[30px]">
            Concerts, matches, workshops and after-dark adventures — from local organizers you can trust.
            Tickets land in your inbox as a QR code.
          </p>
          <HeroSearch cities={data.cities.map((c) => c.name)} popular={data.categories.slice(0, 3)} />
        </div>
      </section>

      {/* Categories */}
      {data.categories.length > 0 && (
        <section className="page-container pt-10 pb-4 md:pt-14 md:pb-6">
          <nav aria-label="Categories" className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-4">
            {data.categories.slice(0, 8).map((c) => (
              <CategoryTile
                key={c.id}
                name={c.name}
                icon={categoryIcons[c.icon]}
                href={`/events?category=${c.id}`}
              />
            ))}
          </nav>
        </section>
      )}

      {/* Trending */}
      <Section
        title="Trending events"
        subtitle="What people are booking right now"
        className="pt-10 md:pt-10"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Chip state="selected" href="/events">
              All
            </Chip>
            <Chip href="/events?date=today">Today</Chip>
            <Chip href="/events?date=weekend">This weekend</Chip>
            <Chip href="/events?price=free">Free</Chip>
            <ButtonLink
              href="/events"
              variant="ghost"
              trailingIcon={<Icon icon={faArrowRight} className="text-[13px]" />}
            >
              View all
            </ButtonLink>
          </div>
        }
      >
        {data.trending.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.trending.map((e) => (
              <EventCard key={e.href} event={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Icon icon={faTicket} />}
            title="No events yet"
            description="Organizers are setting things up. Check back soon — or create the first event yourself."
            action={<ButtonLink href="/become-an-organizer">Create an event</ButtonLink>}
          />
        )}
      </Section>

      {/* This weekend */}
      {data.weekend.length > 0 && (
        <Section
          muted
          eyebrow={data.weekendLabel}
          title="Upcoming this weekend"
          action={
            <ButtonLink
              href="/events?date=weekend"
              variant="ghost"
              trailingIcon={<Icon icon={faArrowRight} className="text-[13px]" />}
            >
              See the weekend
            </ButtonLink>
          }
        >
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.weekend.slice(0, 4).map((e) => (
              <EventCard key={e.href} event={e} />
            ))}
          </div>
        </Section>
      )}

      {/* Cities */}
      {data.cities.length > 1 && (
        <Section title="Browse by city">
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {data.cities.map((c) => (
              <CityTile
                key={c.name}
                name={c.name}
                count={c.count}
                href={`/events?city=${encodeURIComponent(c.name)}`}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Featured organizers */}
      {data.featured.length > 0 && (
        <Section title="Featured organizers" className="pt-0 md:pt-0">
          <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {data.featured.map((o) => (
              <OrganizerCard key={o.href} organizer={o} />
            ))}
          </div>
        </Section>
      )}

      {/* For organizers */}
      <section className="page-container pb-14 md:pb-20">
        <div className="grid overflow-hidden rounded-sheet bg-primary md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-6 p-7 text-white md:p-14">
            <span className="text-[13px] font-bold tracking-[0.1em] text-[#FFB6A4] uppercase">
              For organizers
            </span>
            <h2 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.025em] md:text-[44px] md:leading-[52px]">
              Sell tickets with us. Keep more of every sale.
            </h2>
            <div className="grid gap-5 sm:grid-cols-3">
              {organizerPerks.map((p) => (
                <div key={p.title} className="flex flex-col gap-2.5">
                  <span className="grid size-11 place-items-center rounded-lg bg-white/14 text-lg">
                    <Icon icon={p.icon} />
                  </span>
                  <b className="font-display text-base font-bold">{p.title}</b>
                  <span className="text-sm leading-5 text-primary-100">{p.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <ButtonLink href="/become-an-organizer" variant="accent" size="lg">
                Create your event
              </ButtonLink>
              <Link
                href="/become-an-organizer#pricing"
                className="flex h-14 items-center rounded-lg border-[1.5px] border-white/40 px-6 text-base font-semibold text-white hover:bg-white/10 focus-ring"
              >
                See pricing
              </Link>
            </div>
          </div>
          <div className="relative hidden min-h-[280px] md:block">
            <Image
              src={STOCK.door}
              alt="A phone showing a QR code ticket"
              fill
              sizes="(min-width: 768px) 50vw, 0px"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-mist">
        <div className="page-container flex flex-col gap-12 py-14 md:py-20">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="type-h2">How it works</h2>
            <p className="text-[17px] text-slate-600">From “what’s on?” to through the door in three steps</p>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-4 rounded-card bg-white p-8">
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-[14px] bg-primary-50 text-[22px] text-primary">
                    <Icon icon={s.icon} />
                  </span>
                  <span aria-hidden className="font-display text-5xl leading-none font-extrabold text-line">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-[22px] leading-[30px] font-bold">{s.title}</h3>
                <p className="text-[15px] leading-6 text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
