import type { Metadata } from 'next';
import { STOCK } from '@/lib/images/stock';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faCircleCheck, faLocationDot, faTag } from '@fortawesome/free-solid-svg-icons';
import { EventCard } from '@/components/events/EventCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { categoryMap } from '@/lib/categories/repository';
import { listPastEvents, listPublishedEvents } from '@/lib/events/repository';
import { toEventCard } from '@/lib/events/view';
import { paragraphs } from '@/lib/format/text';
import { getOrganizerBySlug } from '@/lib/organizers/repository';
import { requireTenant } from '@/lib/tenant/current';

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const tenant = await requireTenant();
  const organizer = await getOrganizerBySlug(tenant.id, slug);
  // Only approved organizers have public profiles.
  return organizer?.status === 'approved' ? { tenant, organizer } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return {};
  return { title: found.organizer.name, description: found.organizer.bio.slice(0, 160) || undefined };
}

export default async function OrganizerProfilePage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const { tenant, organizer } = found;

  const [catMap, upcoming, past] = await Promise.all([
    categoryMap(tenant.id),
    listPublishedEvents(tenant.id, { organizerId: organizer.id }, { size: 24 }),
    listPastEvents(tenant.id, organizer.id, 6),
  ]);
  const category = organizer.category ? catMap.get(organizer.category)?.name : null;
  const pastFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tenant.timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <>
      <div className="relative h-[140px] bg-ink md:h-[240px]">
        {/* Per-organizer covers are deferred (docs/deferred.md): one shared stock cover for now. */}
        <Image
          src={STOCK.organizerCover}
          alt=""
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
      </div>
      <div className="page-container">
        <div className="relative -mt-12 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end md:gap-6">
          {organizer.logo ? (
            <span className="relative size-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white md:size-[148px]">
              <Image src={organizer.logo.url} alt="" fill sizes="148px" className="object-cover" />
            </span>
          ) : (
            <Avatar
              name={organizer.name}
              className="size-24 border-4 border-white text-3xl md:size-[148px] md:text-[44px]"
            />
          )}
          <div className="flex flex-1 flex-col gap-2 md:pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-4xl md:leading-[44px]">
                {organizer.name}
              </h1>
              <Badge tone="primary" icon={<Icon icon={faCircleCheck} />}>
                Verified
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
              {category && (
                <span className="flex items-center gap-1.5">
                  <Icon icon={faTag} className="text-slate-500" />
                  {category}
                </span>
              )}
              {organizer.city && (
                <span className="flex items-center gap-1.5">
                  <Icon icon={faLocationDot} className="text-slate-500" />
                  {organizer.city}
                </span>
              )}
              {organizer.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Icon icon={faCalendar} className="text-slate-500" />
                  Since {organizer.createdAt.getFullYear()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-w-0 flex-col gap-6">
            <h2 className="type-h3">Upcoming events ({upcoming.total})</h2>
            {upcoming.events.length ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {upcoming.events.map((e) => (
                  <EventCard key={e.id} event={toEventCard(e, catMap)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Icon icon={faCalendar} />}
                title="No upcoming events"
                description="Check back soon for new dates."
              />
            )}
          </section>
          <aside className="flex flex-col gap-8">
            {organizer.bio && (
              <section className="flex flex-col gap-3">
                <h2 className="type-h5">About</h2>
                {paragraphs(organizer.bio).map((p, i) => (
                  <p key={i} className="text-[15px] leading-6 text-slate-600">
                    {p}
                  </p>
                ))}
              </section>
            )}
            {past.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="type-h5">Past events</h2>
                <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line-soft">
                  {past.map((e) => (
                    <li key={e.id} className="flex flex-col px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {e.startAt ? pastFmt.format(e.startAt) : ''}
                      </span>
                      <span className="text-sm font-semibold">{e.title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
