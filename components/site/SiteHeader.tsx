import Link from 'next/link';
import { faCartShopping, faLocationDot, faMagnifyingGlass, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { MobileMenu } from './MobileMenu';

type Props = { tenantName: string; cartCount?: number };

function CartLink({ count, small }: { count: number; small?: boolean }) {
  return (
    <Link
      href="/checkout"
      aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
      className="relative grid size-11 place-items-center rounded-full text-ink hover:bg-mist focus-ring"
    >
      <Icon icon={faCartShopping} className="text-[17px]" />
      {count > 0 && (
        <span
          className={
            'absolute right-1 grid place-items-center rounded-full border-2 border-white bg-accent font-bold text-ink ' +
            (small ? 'top-1.5 h-4 min-w-4 text-[10px]' : 'top-[5px] h-[18px] min-w-[18px] text-[11px]')
          }
        >
          {count}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ tenantName, cartCount = 0 }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-[#E9E9F0] bg-white">
      {/* Desktop */}
      <div className="page-container hidden h-[72px] items-center gap-7 lg:flex">
        <Logo name={tenantName} className="shrink-0" />
        {/* Keyword search → events listing filters (Phase 3). Location picker is a placeholder. */}
        <form
          action="/events"
          role="search"
          className="flex h-11 max-w-[400px] min-w-0 flex-1 items-center gap-2.5 rounded-full border border-[#E9E9F0] bg-field pr-1.5 pl-4 focus-within:border-primary"
        >
          <Icon icon={faMagnifyingGlass} className="text-sm text-slate-500" />
          <label htmlFor="header-search" className="sr-only">
            Search events
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            placeholder="Search events, artists, venues"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E9E9F0] bg-white px-3 text-[13px] font-medium">
            <Icon icon={faLocationDot} className="text-xs text-primary" />
            New York
          </span>
        </form>
        <nav
          aria-label="Main"
          className="flex shrink-0 items-center gap-6 text-[15px] font-medium whitespace-nowrap"
        >
          <Link href="/events" className="hover:text-primary">
            Browse Events
          </Link>
          <Link href="/become-an-organizer" className="flex items-center gap-[7px] hover:text-primary">
            <Icon icon={faPlus} className="text-xs text-primary" />
            Create Event
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <CartLink count={cartCount} />
          <Link
            href="/login"
            className="flex h-11 items-center rounded-input px-4 text-[15px] font-semibold hover:bg-mist focus-ring"
          >
            Log in
          </Link>
          <ButtonLink href="/register" size="md" className="h-11 px-5">
            Sign up
          </ButtonLink>
        </div>
      </div>

      {/* Mobile / tablet */}
      <div className="flex h-[60px] items-center gap-1 px-4 lg:hidden">
        <Logo name={tenantName} size="sm" className="mr-auto" />
        <Link
          href="/events"
          aria-label="Search events"
          className="grid size-11 place-items-center rounded-full hover:bg-mist focus-ring"
        >
          <Icon icon={faMagnifyingGlass} className="text-[17px]" />
        </Link>
        <CartLink count={cartCount} small />
        <MobileMenu />
      </div>
    </header>
  );
}
