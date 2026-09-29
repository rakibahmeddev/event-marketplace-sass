import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type ChoiceProps = Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode };

const box =
  'peer relative shrink-0 appearance-none border-[1.5px] border-slate-250 bg-white transition-colors outline-none focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--brand-primary)] disabled:opacity-50';

/** Checkbox — 22px, radius 6, filled violet with a check when on. */
export function Checkbox({ label, className, ...rest }: ChoiceProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[15px]', className)}>
      <span className="relative inline-grid size-[22px] place-items-center">
        <input
          type="checkbox"
          className={cn(box, 'size-[22px] rounded-md checked:border-primary checked:bg-primary')}
          {...rest}
        />
        <svg
          viewBox="0 0 12 10"
          aria-hidden
          className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
        >
          <path
            d="M1 5.2 4.2 8.4 11 1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

/** Radio — 22px ring that thickens to 6px violet when selected. */
export function Radio({ label, className, ...rest }: ChoiceProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[15px]', className)}>
      <input
        type="radio"
        className={cn(box, 'size-[22px] rounded-full checked:border-[6px] checked:border-primary')}
        {...rest}
      />
      {label}
    </label>
  );
}

/** Toggle switch — 44×26 track. Native checkbox with role="switch"; no JS needed. */
export function Switch({ label, className, ...rest }: ChoiceProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 text-[15px]', className)}>
      <input
        type="checkbox"
        role="switch"
        className={cn(
          'relative h-[26px] w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors outline-none checked:bg-primary focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--brand-primary)] disabled:opacity-50',
          'before:absolute before:top-[3px] before:left-[3px] before:size-5 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-[18px]',
        )}
        {...rest}
      />
      {label}
    </label>
  );
}
