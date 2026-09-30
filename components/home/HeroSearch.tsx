import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faLocationDot, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import type { Category } from '@/lib/categories/schema';

const fieldLabel = 'text-xs font-bold tracking-[0.06em] text-ink uppercase';
const control = 'w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-500';

/** Design 02 hero: What / Where / When → /events filters (plain GET form, works without JS). */
export function HeroSearch({ cities, popular }: { cities: string[]; popular: Category[] }) {
  return (
    <div className="flex flex-col gap-6">
      <form
        action="/events"
        role="search"
        className="mt-3 flex max-w-[960px] flex-col rounded-card bg-white p-2 shadow-[0_20px_50px_rgb(0_0_0/0.3)] md:flex-row md:items-stretch"
      >
        <label className="flex flex-[1.4] flex-col gap-1 border-b border-line-soft px-5 py-2.5 md:border-r md:border-b-0">
          <span className={fieldLabel}>What</span>
          <span className="flex items-center gap-2.5 text-slate-500">
            <Icon icon={faMagnifyingGlass} />
            <input name="q" type="search" placeholder="Event, artist or keyword" className={control} />
          </span>
        </label>
        <label className="flex flex-1 flex-col gap-1 border-b border-line-soft px-5 py-2.5 md:border-r md:border-b-0">
          <span className={fieldLabel}>Where</span>
          <span className="flex items-center gap-2.5">
            <Icon icon={faLocationDot} className="text-primary" />
            <select name="city" defaultValue="" className={`${control} appearance-none`}>
              <option value="">Anywhere</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="flex flex-1 flex-col gap-1 px-5 py-2.5">
          <span className={fieldLabel}>When</span>
          <span className="flex items-center gap-2.5 text-slate-500">
            <Icon icon={faCalendar} />
            <select name="date" defaultValue="" className={`${control} appearance-none`}>
              <option value="">Any date</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="weekend">This weekend</option>
            </select>
          </span>
        </label>
        <button
          type="submit"
          className="mt-2 flex h-14 items-center justify-center gap-2.5 rounded-lg bg-primary px-8 text-base font-semibold text-white transition-colors hover:bg-primary-hover focus-ring md:mt-0 md:h-auto"
        >
          <Icon icon={faMagnifyingGlass} />
          Search
        </button>
      </form>
      {popular.length > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 text-sm text-[#C9C6DA]">
          <span>Popular:</span>
          <Link
            href="/events?date=weekend&price=free"
            className="flex h-8 items-center rounded-full border border-white/25 px-3.5 text-white hover:bg-white/10"
          >
            Free this weekend
          </Link>
          {popular.map((c) => (
            <Link
              key={c.id}
              href={`/events?category=${c.id}`}
              className="flex h-8 items-center rounded-full border border-white/25 px-3.5 text-white hover:bg-white/10"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
