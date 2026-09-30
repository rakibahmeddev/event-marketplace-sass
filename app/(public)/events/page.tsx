import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import {
  faChevronLeft,
  faChevronRight,
  faList,
  faMagnifyingGlass,
  faTableCells,
} from '@fortawesome/free-solid-svg-icons';
import { FilterPanel } from '@/components/browse/FilterPanel';
import { MobileFilters } from '@/components/browse/MobileFilters';
import { EventCard } from '@/components/events/EventCard';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { categoryMap, listCategories } from '@/lib/categories/repository';
import { browseHref, parseBrowseParams, toFilters, type BrowseParams } from '@/lib/events/browse';
import { listEventCities } from '@/lib/events/discovery';
import { listPublishedEvents } from '@/lib/events/repository';
import { toEventCard } from '@/lib/events/view';
import { requireTenant } from '@/lib/tenant/current';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Browse events' };

const PAGE_SIZE = 12;
const DATE_LABELS: Record<string, string> = { today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BrowseEventsPage({ searchParams }: Props) {
  const tenant = await requireTenant();
  const params = parseBrowseParams(await searchParams);
  const filters = toFilters(params, tenant.timezone, new Date());
  const [categories, catMap, cities, page] = await Promise.all([
    listCategories(tenant.id),
    categoryMap(tenant.id),
    listEventCities(tenant.id),
    listPublishedEvents(tenant.id, filters, { size: PAGE_SIZE, after: params.after, before: params.before }),
  ]);
  const events = page.events.filter((e) => filters.extraWords.every((w) => e.searchWords.includes(w)));
  const view = params.view ?? 'grid';

  const active: { label: string; remove: Partial<Record<keyof BrowseParams, undefined>> }[] = [];
  if (params.q) active.push({ label: `“${params.q}”`, remove: { q: undefined } });
  if (params.category)
    active.push({ label: catMap.get(params.category)?.name ?? 'Category', remove: { category: undefined } });
  if (params.date)
    active.push({ label: DATE_LABELS[params.date] ?? params.date, remove: { date: undefined } });
  if (params.price)
    active.push({ label: params.price === 'free' ? 'Free' : 'Paid', remove: { price: undefined } });
  if (params.type)
    active.push({ label: params.type === 'online' ? 'Online' : 'In-person', remove: { type: undefined } });
  if (params.city) active.push({ label: params.city, remove: { city: undefined } });

  const title = params.city
    ? `Events in ${params.city}`
    : params.q
      ? `Results for “${params.q}”`
      : 'All events';
  const countLabel = `${page.total} event${page.total === 1 ? '' : 's'}`;
  const panel = <FilterPanel params={params} categories={categories} cities={cities} />;

  return (
    <>
      <div className="border-b border-line-soft bg-white">
        <div className="page-container flex flex-col gap-2.5 py-6 md:py-7">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Events', href: '/events' },
              ...(params.city ? [{ label: params.city }] : []),
            ]}
          />
          <h1 className="font-display text-[28px] leading-9 font-extrabold tracking-[-0.02em] md:text-4xl md:leading-[44px]">
            {title}
          </h1>
        </div>
      </div>

      <div className="page-container grid items-start gap-8 py-6 md:py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden rounded-card border border-line-soft bg-white lg:block">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-[18px]">
            <b className="font-display text-[17px] font-bold">Filters</b>
            {active.length > 0 && (
              <Link
                href="/events"
                className="text-[13px] font-semibold text-primary hover:text-primary-hover"
              >
                Clear all
              </Link>
            )}
          </div>
          {panel}
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Suspense>
                <MobileFilters activeCount={active.length} resultLabel={`Show ${countLabel}`}>
                  {panel}
                </MobileFilters>
              </Suspense>
              <p className="text-[15px] text-slate-600">
                <b className="text-ink">{countLabel}</b>
                {params.date && DATE_LABELS[params.date]
                  ? ` ${DATE_LABELS[params.date]!.toLowerCase()}`
                  : ''}{' '}
                · soonest first
              </p>
            </div>
            <div
              className="hidden overflow-hidden rounded-input border-[1.5px] border-line sm:flex"
              role="group"
              aria-label="Layout"
            >
              {(
                [
                  ['grid', faTableCells, 'Grid view'],
                  ['list', faList, 'List view'],
                ] as const
              ).map(([key, icon, label]) => (
                <Link
                  key={key}
                  href={browseHref(params, {
                    view: key === 'grid' ? undefined : key,
                    after: params.after,
                    before: params.before,
                  })}
                  scroll={false}
                  aria-label={label}
                  aria-current={view === key ? 'true' : undefined}
                  className={cn(
                    'grid size-10 place-items-center',
                    view === key ? 'bg-primary-50 text-primary' : 'text-slate-500 hover:text-ink',
                  )}
                >
                  <Icon icon={icon} />
                </Link>
              ))}
            </div>
          </div>

          {active.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {active.map((a) => (
                <Chip key={a.label} state="active" removable href={browseHref(params, a.remove)}>
                  {a.label}
                </Chip>
              ))}
            </div>
          )}

          {events.length === 0 ? (
            <EmptyState
              icon={<Icon icon={faMagnifyingGlass} />}
              title="No events match"
              description="Try a different date or remove a filter."
              action={
                <ButtonLink href="/events" variant="secondary">
                  Clear filters
                </ButtonLink>
              }
            />
          ) : view === 'list' ? (
            <div className="flex flex-col gap-4">
              {events.map((e) => (
                <EventCard key={e.id} event={toEventCard(e, catMap)} layout="list" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((e) => (
                <EventCard key={e.id} event={toEventCard(e, catMap)} />
              ))}
            </div>
          )}

          {(page.prev || page.next) && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-4 pb-6">
              <PageLink
                href={page.prev ? browseHref(params, { before: page.prev, view: params.view }) : null}
                icon={faChevronLeft}
                label="Prev"
              />
              <PageLink
                href={page.next ? browseHref(params, { after: page.next, view: params.view }) : null}
                icon={faChevronRight}
                label="Next"
                trailing
              />
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

function PageLink({
  href,
  icon,
  label,
  trailing,
}: {
  href: string | null;
  icon: typeof faChevronLeft;
  label: string;
  trailing?: boolean;
}) {
  const inner = (
    <>
      {!trailing && <Icon icon={icon} className="text-[11px]" />}
      {label}
      {trailing && <Icon icon={icon} className="text-[11px]" />}
    </>
  );
  const cls =
    'flex h-11 items-center gap-2 rounded-input border-[1.5px] border-line bg-white px-4 text-sm font-semibold';
  if (!href)
    return (
      <span aria-disabled className={cn(cls, 'text-slate-400')}>
        {inner}
      </span>
    );
  return (
    <Link href={href} className={cn(cls, 'hover:border-line-strong focus-ring')}>
      {inner}
    </Link>
  );
}
