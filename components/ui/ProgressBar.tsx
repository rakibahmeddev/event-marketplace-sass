import { cn } from '@/lib/utils/cn';

type Props = { value: number; max?: number; label: string; className?: string };

/** Sales / check-in progress. Turns coral above 80% (selling fast). */
export function ProgressBar({ value, max = 100, label, className }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-line-soft', className)}
    >
      <div
        className={cn('h-full rounded-full', pct > 80 ? 'bg-accent' : 'bg-primary')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
