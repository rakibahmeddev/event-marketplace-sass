import { cn } from '@/lib/utils/cn';

const sizes = {
  sm: 'size-9 text-[13px] rounded-input',
  md: 'size-10 text-[13px] rounded-full',
  lg: 'size-16 text-[22px] rounded-full',
  xl: 'size-[84px] text-[26px] rounded-full',
};

const tones = {
  ink: 'bg-ink text-white',
  soft: 'bg-primary-50 text-primary',
  white: 'bg-white text-ink',
};

type Props = {
  name: string;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  ring?: boolean;
  className?: string;
};

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Initials avatar. Image avatars (organizer logos) come with Storage in Phase 3. */
export function Avatar({ name, size = 'md', tone = 'ink', ring, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center font-display font-extrabold',
        sizes[size],
        tones[tone],
        ring && 'shadow-[0_0_0_4px_#fff,0_0_0_6px_var(--brand-primary-100)]',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
