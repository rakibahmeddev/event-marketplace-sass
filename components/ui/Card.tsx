import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

type CardProps = ComponentProps<'div'> & { interactive?: boolean; padded?: boolean };

/** White card · radius 16 · 1px line · subtle shadow. `interactive` adds the hover lift. */
export function Card({ interactive, padded, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line-soft bg-white shadow-card',
        interactive &&
          'transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift',
        padded && 'p-4 md:p-6',
        className,
      )}
      {...rest}
    />
  );
}
