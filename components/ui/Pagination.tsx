import Link from 'next/link';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';
import { paginationRange } from './pagination-range';

type Props = { page: number; totalPages: number; hrefFor: (page: number) => string; className?: string };

const cell =
  'grid h-11 min-w-11 place-items-center rounded-input text-sm font-semibold transition-colors focus-ring';
const step =
  'flex h-11 items-center gap-2 rounded-input px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-ring';
const outline = 'border-[1.5px] border-line bg-white hover:border-line-strong';

export function Pagination({ page, totalPages, hrefFor, className }: Props) {
  if (totalPages <= 1) return null;
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={prevDisabled || undefined}
        tabIndex={prevDisabled ? -1 : undefined}
        className={cn(step, outline, prevDisabled && 'pointer-events-none text-slate-400')}
      >
        <Icon icon={faChevronLeft} className="text-[11px]" />
        <span className="hidden sm:inline">Prev</span>
      </Link>
      {paginationRange(page, totalPages).map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e${i}`} className="grid size-11 place-items-center text-slate-500" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(cell, p === page ? 'bg-primary text-white' : outline)}
          >
            {p}
          </Link>
        ),
      )}
      <Link
        href={hrefFor(page + 1)}
        aria-disabled={nextDisabled || undefined}
        tabIndex={nextDisabled ? -1 : undefined}
        className={cn(step, outline, nextDisabled && 'pointer-events-none text-slate-400')}
      >
        <span className="hidden sm:inline">Next</span>
        <Icon icon={faChevronRight} className="text-[11px]" />
      </Link>
    </nav>
  );
}
