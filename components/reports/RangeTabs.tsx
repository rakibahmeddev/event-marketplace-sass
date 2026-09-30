import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/** 7D / 30D / 90D segmented control (design 09) as links, so it works without JavaScript. */
export function RangeTabs({
  options,
  active,
  hrefFor,
  label = 'Date range',
}: {
  options: { key: string; label: string }[];
  active: string;
  hrefFor: (key: string) => string;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="flex rounded-input bg-line-soft p-[3px] text-[13px] font-semibold">
      {options.map((o) => (
        <Link
          key={o.key}
          href={hrefFor(o.key)}
          scroll={false}
          aria-current={o.key === active ? 'true' : undefined}
          className={cn(
            'rounded-lg px-3 py-[7px] focus-ring',
            o.key === active
              ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.08)]'
              : 'text-slate-600 hover:text-ink',
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
