import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import {
  faCalendarPlus,
  faCircleCheck,
  faFire,
  faLocationDot,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { EventCard } from '@/components/events/EventCard';
import { ShareButton } from '@/components/event/ShareButton';
import { TicketSelector, type TicketOption } from '@/components/event/TicketSelector';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CoverImage } from '@/components/ui/CoverImage';
import { Icon } from '@/components/ui/Icon';
import { categoryMap } from '@/lib/categories/repository';
import { getPublicEventBySlug, listPublishedEvents, listTicketTypes } from '@/lib/events/repository';
import { availability, toEventCard } from '@/lib/events/view';
import { paragraphs } from '@/lib/format/text';
import { eventDateLabels } from '@/lib/format/time';
import { requireTenant } from '@/lib/tenant/current';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await requireTenant();
  const event = await getPublicEventBySlug(tenant.id, (await params).slug);
  if (!event) return {};
  const description = event.description.slice(0, 160) || `${event.title} — tickets on ${tenant.name}.`;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.images[0] ? [event.images[0].url] : [] },
  };
}

export default async function EventPage({ params }: Props) {
  const tenant = await requireTenant();
  const event = await getPublicEventBySlug(tenant.id, (await params).slug);
  if (!event || !event.startAt || !event.endAt) notFound();

  const [ticketTypes, catMap, moreFromOrganizer, similar] = await Promise.all([
    listTicketTypes(tenant.id, event.id),
    categoryMap(tenant.id),
    listPublishedEvents(tenant.id, { organizerId: event.organizerId }, { size: 5 }),
    event.category ? listPublishedEvents(tenant.id, { category: event.category }, { size: 5 }) : null,
  ]);

  const labels = eventDateLabels(event.startAt, event.endAt, event.timezone);
  const category = event.category ? catMap.get(event.category)?.name : null;
  const now = new Date();
  const ended = event.endAt <= now;
  const cancelled = event.status === 'cancelled';
  const a = availability(event);
  const pctSold = event.totalQuantity ? Math.round((event.totalSold / event.totalQuantity) * 100) : 0;
  const dayFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const options: TicketOption[] = ticketTypes.map((t) => {
    const remaining = Math.max(0, t.quantity - t.sold - t.reserved);
    const salesEnd = t.salesEndAt ?? event.startAt!;
    let unavailable: TicketOption['unavailable'] = null;
    if (remaining === 0) unavailable = 'sold-out';
    else if (t.salesStartAt && t.salesStartAt > now)
      unavailable = { startsLabel: dayFmt.format(t.salesStartAt) };
    else if (salesEnd <= now) unavailable = 'ended';
    return { id: t.id, name: t.name, description: t.description, price: t.price, remaining, unavailable };
  });

  const others = (list: typeof moreFromOrganizer | null) =>
    (list?.events ?? [])
      .filter((e) => e.id !== event.id)
      .slice(0, 4)
      .map((e) => toEventCard(e, catMap));
  const more = others(moreFromOrganizer);
  const similarCards = others(similar).filter((c) => !more.some((m) => m.href === c.href));

  return (
    <>
      <div className="page-container pt-4 md:pt-6">
        <div className="relative h-[220px] overflow-hidden rounded-panel sm:h-[320px] lg:h-[460px]">
          <CoverImage
            url={event.images[0]?.url}
            alt={event.title}
            label="event banner photo"
            sizes="(min-width: 1280px) 1216px, 100vw"
            preload
          />
          <div className="absolute top-4 right-4 flex gap-2.5 md:top-5 md:right-5">
            <ShareButton title={event.title} />
          </div>
          {a === 'selling-fast' && !ended && !cancelled && (
            <Badge
              tone="accent"
              className="absolute bottom-4 left-4 h-[30px] md:bottom-5 md:left-5"
              icon={<Icon icon={faFire} />}
            >
              Selling fast · {pctSold}% sold
            </Badge>
          )}
        </div>
      </div>

      <div className="page-container grid items-start gap-8 pt-8 pb-24 md:pt-10 md:pb-20 lg:grid-cols-12 lg:gap-6">
        <div className="flex flex-col gap-8 lg:col-span-8 lg:pr-6">
          {cancelled && (
            <Alert tone="danger" title="This event has been cancelled">
              Ticket holders will be contacted by the organizer about refunds.
            </Alert>
          )}
          {ended && !cancelled && <Alert tone="info">This event has ended.</Alert>}

          <div className="flex flex-col gap-4">
            {category && (
              <span className="text-[13px] font-semibold tracking-[0.08em] text-primary uppercase">
                {category}
              </span>
            )}
            <h1 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.03em] text-pretty md:text-5xl md:leading-[56px]">
              {event.title}
            </h1>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                  <Icon icon={faCalendar} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <b className="text-base">{labels.long}</b>
                  <span className="text-sm text-slate-600">{labels.timeRange}</span>
                  {!ended && !cancelled && (
                    <a
                      href={`/events/${event.slug}/calendar`}
                      className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover"
                    >
                      <Icon icon={faCalendarPlus} />
                      Add to calendar
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                  <Icon icon={event.isOnline ? faVideo : faLocationDot} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <b className="text-base">{event.isOnline ? 'Online event' : event.venue.name}</b>
                  <span className="text-sm text-slate-600">
                    {event.isOnline
                      ? 'Joining details arrive with your ticket'
                      : [event.venue.address, event.venue.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-card bg-mist p-5">
            <Avatar name={event.organizerName} className="size-14 text-lg" />
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13px] text-slate-500">Organized by</span>
              <Link
                href={`/o/${event.organizerSlug}`}
                className="flex items-center gap-1.5 font-display text-[17px] font-bold hover:text-primary"
              >
                {event.organizerName}
                <Icon icon={faCircleCheck} label="Verified organizer" className="text-sm text-primary" />
              </Link>
            </div>
          </div>

          <nav
            aria-label="Event sections"
            className="sticky top-[60px] z-10 flex gap-1 overflow-x-auto border-b border-line-soft bg-white lg:top-[72px]"
          >
            {[
              ['#about', 'About'],
              ...(event.isOnline ? [] : [['#venue', 'Venue']]),
              ...(event.refundPolicy ? [['#refunds', 'Refund policy']] : []),
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="px-4 py-3.5 text-[15px] font-semibold whitespace-nowrap text-slate-600 hover:text-primary"
              >
                {label}
              </a>
            ))}
          </nav>

          <section id="about" className="flex scroll-mt-32 flex-col gap-3.5">
            <h2 className="type-h4">About this event</h2>
            {paragraphs(event.description).map((p, i) => (
              <p key={i} className="text-base leading-[26px] whitespace-pre-line text-body">
                {p}
              </p>
            ))}
            {!event.description && (
              <p className="text-slate-500">The organizer hasn’t added a description yet.</p>
            )}
          </section>

          {!event.isOnline && (
            <section id="venue" className="flex scroll-mt-32 flex-col gap-3.5">
              <h2 className="type-h4">Venue</h2>
              <div className="flex flex-col rounded-card border border-line-soft p-5">
                <b>{event.venue.name}</b>
                <span className="text-sm text-slate-600">
                  {[event.venue.address, event.venue.city, event.venue.country].filter(Boolean).join(', ')}
                </span>
              </div>
            </section>
          )}

          {event.refundPolicy && (
            <section id="refunds" className="flex scroll-mt-32 flex-col gap-3.5">
              <h2 className="type-h4">Refund policy</h2>
              <p className="text-base leading-[26px] whitespace-pre-line text-body">{event.refundPolicy}</p>
            </section>
          )}
        </div>

        <div className="lg:col-span-4">
          {cancelled || ended ? (
            <div className="rounded-panel border border-line-soft bg-mist p-6 text-center text-[15px] text-slate-600">
              Tickets are no longer available for this event.
            </div>
          ) : (
            <TicketSelector options={options} currency={event.currency} checkoutOpen={false} />
          )}
        </div>
      </div>

      {(more.length > 0 || similarCards.length > 0) && (
        <section className="bg-mist">
          <div className="page-container flex flex-col gap-14 py-14 md:py-[72px]">
            {more.length > 0 && (
              <div className="flex flex-col gap-6">
                <h2 className="type-h3">More from {event.organizerName}</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {more.map((c) => (
                    <EventCard key={c.href} event={c} />
                  ))}
                </div>
              </div>
            )}
            {similarCards.length > 0 && (
              <div className="flex flex-col gap-6">
                <h2 className="type-h3">Similar events</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {similarCards.map((c) => (
                    <EventCard key={c.href} event={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
