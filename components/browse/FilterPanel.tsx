import Link from 'next/link';
import type { ReactNode } from 'react';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/lib/categories/schema';
import { browseHref, type BrowseParams } from '@/lib/events/browse';
import { cn } from '@/lib/utils/cn';

function Group({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <fieldset className={cn('flex flex-col gap-3 p-5', !last && 'border-b border-line-soft')}>
      <legend className="float-left mb-3 w-full text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Option({
  href,
  active,
  children,
  kind,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
  kind: 'check' | 'radio';
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className="flex items-center gap-2.5 rounded-md text-sm hover:text-primary focus-ring"
    >
      <span
        aria-hidden
        className={cn(
          'grid size-5 shrink-0 place-items-center text-[11px]',
          kind === 'check' ? 'rounded-md' : 'rounded-full',
          active
            ? kind === 'check'
              ? 'bg-primary text-white'
              : 'border-[6px] border-primary'
            : 'border-[1.5px] border-slate-250',
        )}
      >
        {active && kind === 'check' && '✓'}
      </span>
      <span className="flex-1">{children}</span>
    </Link>
  );
}

function Pill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold focus-ring',
        active ? 'bg-ink text-white' : 'border-[1.5px] border-line hover:border-line-strong',
      )}
    >
      {children}
    </Link>
  );
}

/** Design 03 filter sidebar. Every option is a link, so filtering works without JavaScript. */
export function FilterPanel({
  params,
  categories,
  cities,
}: {
  params: BrowseParams;
  categories: Category[];
  cities: string[];
}) {
  const customDate = params.date && /^\d{4}-/.test(params.date) ? params.date : '';
  return (
    <div className="flex flex-col">
      <Group title="Category">
        {categories.map((c) => (
          <Option
            key={c.id}
            kind="check"
            active={params.category === c.id}
            href={browseHref(params, { category: params.category === c.id ? undefined : c.id })}
          >
            {c.name}
          </Option>
        ))}
      </Group>
      <Group title="Date">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['today', 'Today'],
              ['tomorrow', 'Tomorrow'],
              ['weekend', 'This weekend'],
            ] as const
          ).map(([key, label]) => (
            <Pill
              key={key}
              active={params.date === key}
              href={browseHref(params, { date: params.date === key ? undefined : key })}
            >
              {label}
            </Pill>
          ))}
        </div>
        {/* Custom day: tiny GET form that keeps the other filters. */}
        <form action="/events" className="flex items-center gap-2">
          {Object.entries(params)
            .filter(([k, v]) => v && !['date', 'after', 'before'].includes(k))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <label className="flex h-10 flex-1 items-center gap-2 rounded-input border-[1.5px] border-line-strong px-3 text-sm focus-within:border-primary">
            <Icon icon={faCalendar} className="text-slate-500" />
            <span className="sr-only">Pick a date</span>
            <input
              type="date"
              name="date"
              defaultValue={customDate}
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-input bg-mist px-3 text-sm font-semibold hover:bg-line-soft focus-ring"
          >
            Go
          </button>
        </form>
      </Group>
      <Group title="Price">
        <div className="grid grid-cols-3 overflow-hidden rounded-input border-[1.5px] border-line text-center text-[13px] font-semibold">
          {(
            [
              [undefined, 'Any'],
              ['free', 'Free'],
              ['paid', 'Paid'],
            ] as const
          ).map(([key, label], i) => (
            <Link
              key={label}
              href={browseHref(params, { price: key })}
              scroll={false}
              aria-current={params.price === key ? 'true' : undefined}
              className={cn(
                'py-2.5 focus-ring',
                i > 0 && 'border-l-[1.5px] border-line',
                params.price === key ? 'bg-primary-50 text-primary-hover' : 'hover:bg-mist',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </Group>
      {cities.length > 0 && (
        <Group title="Location">
          <Option kind="radio" active={!params.city} href={browseHref(params, { city: undefined })}>
            Anywhere
          </Option>
          {cities.map((c) => (
            <Option key={c} kind="radio" active={params.city === c} href={browseHref(params, { city: c })}>
              {c}
            </Option>
          ))}
        </Group>
      )}
      <Group title="Event type" last>
        {(
          [
            [undefined, 'Any'],
            ['in-person', 'In-person'],
            ['online', 'Online'],
          ] as const
        ).map(([key, label]) => (
          <Option
            key={label}
            kind="radio"
            active={params.type === key}
            href={browseHref(params, { type: key })}
          >
            {label}
          </Option>
        ))}
      </Group>
    </div>
  );
}
