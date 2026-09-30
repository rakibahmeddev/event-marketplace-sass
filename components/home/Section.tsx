import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Home/browse section: 80 px desktop / 56 px mobile vertical padding, heading → content 28 px. */
export function Section({
  title,
  eyebrow,
  subtitle,
  action,
  muted,
  className,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  muted?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(muted && 'bg-mist')}>
      <div className={cn('page-container flex flex-col gap-7 py-14 md:py-20', className)}>
        <div className="flex flex-wrap items-end justify-between gap-4 md:gap-6">
          <div className="flex flex-col gap-2">
            {eyebrow && (
              <span className="text-[13px] font-bold tracking-[0.1em] text-[#C2381A] uppercase">
                {eyebrow}
              </span>
            )}
            <h2 className="type-h2">{title}</h2>
            {subtitle && <p className="text-base text-slate-600">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}
