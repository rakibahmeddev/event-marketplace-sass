import Link from 'next/link';
import { faCalendar, faHeart } from '@fortawesome/free-regular-svg-icons';
import { faBan, faFire, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/Badge';
import { DateBadge } from '@/components/ui/DateBadge';
import { Icon } from '@/components/ui/Icon';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { cn } from '@/lib/utils/cn';

/** Display-ready event summary. Built from Firestore data by a mapper in Phase 3. */
export type EventCardData = {
  href: string;
  title: string;
  category: string;
  month: string;
  day: string;
  when: string;
  venue: string;
  priceLabel: string;
  organizerName: string;
  status?: 'selling-fast' | 'sold-out';
  imageLabel: string;
};

function Meta({ event }: { event: EventCardData }) {
  return (
    <>
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <Icon icon={faCalendar} className="w-3.5 text-slate-500" />
        {event.when}
      </span>
      <span className="flex items-center gap-2 text-sm text-slate-600">
        <Icon icon={faLocationDot} className="w-3.5 text-slate-500" />
        {event.venue}
      </span>
    </>
  );
}

export function EventCard({ event, layout = 'grid' }: { event: EventCardData; layout?: 'grid' | 'list' }) {
  const fast = event.status === 'selling-fast';
  const sold = event.status === 'sold-out';

  if (layout === 'list') {
    return (
      <Link
        href={event.href}
        className="flex flex-col overflow-hidden rounded-card border border-line-soft bg-white shadow-card transition-shadow hover:shadow-lift focus-ring sm:flex-row"
      >
        <div className="relative min-h-[170px] shrink-0 sm:w-[260px]">
          <ImagePlaceholder label={event.imageLabel} labelPosition="corner" className="absolute inset-0" />
          <DateBadge
            month={event.month}
            day={event.day}
            size="sm"
            className="absolute top-3 left-3 shadow-none"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[7px] px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="type-caption text-primary">{event.category}</span>
            {fast && (
              <Badge tone="accent-soft" size="sm" icon={<Icon icon={faFire} />}>
                Selling fast
              </Badge>
            )}
            {sold && (
              <Badge tone="dark" size="sm">
                Sold out
              </Badge>
            )}
          </div>
          <h3 className="font-display text-[19px] leading-[26px] font-bold">{event.title}</h3>
          <Meta event={event} />
          <span className="text-[13px] text-slate-500">by {event.organizerName}</span>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line-faint px-6 py-5 sm:w-[180px] sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:border-l">
          <span className="text-[17px] font-bold">{event.priceLabel}</span>
          <span className="flex h-10 items-center rounded-input bg-primary px-[18px] text-sm font-semibold text-white">
            {sold ? 'View event' : 'Get tickets'}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={event.href}
      className="flex h-full flex-col overflow-hidden rounded-card border border-line-soft bg-white shadow-card transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-ring"
    >
      <div className="relative aspect-[16/10] shrink-0">
        <ImagePlaceholder label={event.imageLabel} className="absolute inset-0" />
        <DateBadge month={event.month} day={event.day} size="sm" className="absolute top-3 left-3" />
        {/* Save/wishlist is deferred (docs/deferred.md) — decorative placeholder. */}
        <span
          aria-hidden
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink"
        >
          <Icon icon={faHeart} className="text-[15px]" />
        </span>
        {fast && (
          <Badge
            tone="accent"
            className="absolute bottom-3 left-3 h-[26px] px-2.5"
            icon={<Icon icon={faFire} />}
          >
            Selling fast
          </Badge>
        )}
        {sold && (
          <Badge
            tone="light"
            className="absolute bottom-3 left-3 h-[26px] px-2.5"
            icon={<Icon icon={faBan} className="text-danger" />}
          >
            Sold out
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="type-caption text-primary">{event.category}</span>
        <h3 className="line-clamp-2 font-display text-[17px] leading-6 font-bold text-pretty">
          {event.title}
        </h3>
        <Meta event={event} />
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-faint pt-3">
          <span className={cn('text-[15px] font-bold whitespace-nowrap')}>{event.priceLabel}</span>
          <span className="truncate text-[13px] text-slate-500">by {event.organizerName}</span>
        </div>
      </div>
    </Link>
  );
}
