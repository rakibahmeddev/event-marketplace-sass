import { cn } from '@/lib/utils/cn';

/** "+12%" in green / "−5%" in red, or nothing when there's no previous period to compare with. */
export function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span className={cn('font-semibold', up ? 'text-success' : 'text-danger')}>
      <span aria-hidden>{up ? '▲' : '▼'}</span> {up ? '+' : '−'}
      {Math.abs(value)}%
    </span>
  );
}
