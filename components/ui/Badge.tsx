import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeTone =
  | 'accent'
  | 'accent-soft'
  | 'dark'
  | 'light'
  | 'success'
  | 'info'
  | 'warning'
  | 'primary'
  | 'danger'
  | 'neutral';

const tones: Record<BadgeTone, string> = {
  accent: 'bg-accent text-ink', // Selling fast
  'accent-soft': 'bg-accent-100 text-[#9E2A0E]', // Selling fast (list card)
  dark: 'bg-ink text-white', // Sold out
  light: 'bg-white text-ink', // Sold out on a photo
  success: 'bg-success-bg text-success-ink', // Free, Paid, Valid
  info: 'bg-primary-50 text-primary-hover', // Online
  warning: 'bg-warning-bg text-warning-ink', // Only 12 left, Pending
  primary: 'bg-primary text-white', // Verified
  danger: 'bg-danger-bg text-danger-ink', // Cancelled, Refunded
  neutral: 'bg-mist text-slate-600',
};

const sizes = {
  sm: 'h-[22px] px-2 text-[11px] gap-[5px]',
  md: 'h-6 px-2.5 text-xs gap-1.5',
  lg: 'h-7 px-3 text-xs gap-1.5',
};

type BadgeProps = {
  tone?: BadgeTone;
  size?: keyof typeof sizes;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Badge({ tone = 'neutral', size = 'lg', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-bold whitespace-nowrap',
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

const orderStatus = {
  paid: { tone: 'success', label: 'Paid' },
  pending: { tone: 'warning', label: 'Pending' },
  failed: { tone: 'danger', label: 'Failed' },
  refunded: { tone: 'danger', label: 'Refunded' },
  expired: { tone: 'neutral', label: 'Expired' },
} as const satisfies Record<string, { tone: BadgeTone; label: string }>;

export type OrderStatus = keyof typeof orderStatus;

/** Order status pill used in tables (data model: orders.status). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { tone, label } = orderStatus[status];
  return (
    <Badge tone={tone} size="md">
      {label}
    </Badge>
  );
}
