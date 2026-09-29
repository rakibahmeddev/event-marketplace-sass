import { cn } from '@/lib/utils/cn';

type Props = { label: string; className?: string; labelPosition?: 'center' | 'corner' };

/**
 * Striped stand-in for photography (events, cities, covers) until Storage images exist.
 * Positioned `relative` by default; pass `absolute inset-0` to fill a positioned parent.
 */
export function ImagePlaceholder({ label, className, labelPosition = 'center' }: Props) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'img-placeholder',
        /\b(absolute|fixed)\b/.test(className ?? '') ? undefined : 'relative',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute font-mono text-[10px] font-medium tracking-[0.04em] text-placeholder-text',
          labelPosition === 'center' ? 'inset-0 grid place-items-center' : 'right-3 bottom-2.5',
        )}
      >
        [ {label} ]
      </span>
    </div>
  );
}
