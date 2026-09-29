import { Fragment } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type Props = { steps: string[]; /** zero-based */ current: number; className?: string };

/** Checkout / organizer-signup progress: done (violet ✓) → current (ink) → upcoming (outline). */
export function Stepper({ steps, current, className }: Props) {
  return (
    <ol className={cn('flex items-center gap-3 text-sm font-semibold md:gap-7', className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={label}>
            {i > 0 && (
              <li aria-hidden className={cn('h-0.5 w-6 md:w-10', i <= current ? 'bg-primary' : 'bg-line')} />
            )}
            <li
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2',
                done && 'text-primary',
                !done && !active && 'text-slate-500',
              )}
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-xs',
                  done && 'bg-primary text-[11px] text-white',
                  active && 'bg-ink text-white',
                  !done && !active && 'border-[1.5px] border-slate-250',
                )}
              >
                {done ? <Icon icon={faCheck} label="Completed" /> : i + 1}
              </span>
              <span className={cn(!active && 'hidden md:inline')}>{label}</span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
