import Link from 'next/link';
import type { ReactNode } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

/** default: outline · selected: ink · active: violet filter, removable */
export type ChipState = 'default' | 'selected' | 'active';

const states: Record<ChipState, string> = {
  default: 'border-[1.5px] border-line bg-white text-ink hover:border-line-strong',
  selected: 'bg-ink text-white',
  active: 'border-[1.5px] border-primary bg-primary-50 text-primary-hover',
};

type ChipProps = {
  state?: ChipState;
  icon?: ReactNode;
  href?: string;
  /** Shows an × — used for active filters. */
  removable?: boolean;
  className?: string;
  children: ReactNode;
};

export function Chip({ state = 'default', icon, href, removable, className, children }: ChipProps) {
  const classes = cn(
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-ring',
    states[state],
    className,
  );
  const content = (
    <>
      {icon && <span className={cn(state === 'default' && 'text-primary')}>{icon}</span>}
      {children}
      {removable && <Icon icon={faXmark} className="text-xs" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={classes} aria-current={state !== 'default' ? 'true' : undefined}>
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
