import { cn } from '@/lib/utils/cn';

type Props = {
  month: string;
  day: string;
  /** light: white tile on photos · filled: violet tile on white */
  variant?: 'light' | 'filled';
  size?: 'sm' | 'md';
  className?: string;
};

export function DateBadge({ month, day, variant = 'light', size = 'md', className }: Props) {
  const filled = variant === 'filled';
  return (
    <div
      className={cn(
        'text-center',
        size === 'md' ? 'w-14 rounded-lg pt-2 pb-1.5' : 'w-12 rounded-input pt-1.5 pb-[5px]',
        filled ? 'bg-primary text-white' : 'bg-white text-ink shadow-badge',
        className,
      )}
    >
      <div
        className={cn(
          'leading-none font-bold tracking-[0.1em] uppercase',
          size === 'md' ? 'text-[11px]' : 'text-[10px]',
          filled ? 'text-primary-100' : 'text-primary',
        )}
      >
        {month}
      </div>
      <div
        className={cn('font-display leading-[1.15] font-extrabold', size === 'md' ? 'text-2xl' : 'text-xl')}
      >
        {day}
      </div>
    </div>
  );
}
