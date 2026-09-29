import type { ReactNode } from 'react';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

const tones = {
  info: { box: 'bg-primary-50 text-ink', icon: faCircleInfo, iconClass: 'text-primary' },
  success: { box: 'bg-success-bg text-success-ink', icon: faCircleCheck, iconClass: 'text-success' },
  warning: { box: 'bg-warning-bg text-warning-ink', icon: faTriangleExclamation, iconClass: 'text-warning' },
  danger: { box: 'bg-danger-bg text-danger-ink', icon: faCircleExclamation, iconClass: 'text-danger' },
};

type Props = { tone?: keyof typeof tones; title?: ReactNode; children: ReactNode; className?: string };

export function Alert({ tone = 'info', title, children, className }: Props) {
  const t = tones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg p-4 text-sm leading-[22px]', t.box, className)}
    >
      <Icon icon={t.icon} className={cn('mt-[3px] shrink-0', t.iconClass)} />
      <div>
        {title && <b className="block">{title}</b>}
        {children}
      </div>
    </div>
  );
}
