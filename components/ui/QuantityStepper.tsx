'use client';

import { useState } from 'react';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type Props = {
  label: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
};

export function QuantityStepper({
  label,
  value,
  defaultValue = 0,
  min = 0,
  max = 99,
  onChange,
  disabled,
  className,
}: Props) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const set = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    if (value === undefined) setInner(clamped);
    onChange?.(clamped);
  };
  const btn =
    'grid h-full w-11 place-items-center text-primary transition-colors hover:bg-primary-50 disabled:text-slate-300 disabled:hover:bg-transparent outline-none focus-visible:bg-primary-50';

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex h-11 items-center overflow-hidden rounded-input border-[1.5px] border-line-strong bg-white',
        className,
      )}
    >
      <button
        type="button"
        className={btn}
        aria-label={`Decrease ${label}`}
        disabled={disabled || current <= min}
        onClick={() => set(current - 1)}
      >
        <Icon icon={faMinus} />
      </button>
      <output aria-live="polite" className="w-10 text-center text-base font-bold">
        {current}
      </output>
      <button
        type="button"
        className={btn}
        aria-label={`Increase ${label}`}
        disabled={disabled || current >= max}
        onClick={() => set(current + 1)}
      >
        <Icon icon={faPlus} />
      </button>
    </div>
  );
}
