import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-card border border-dashed border-line-strong bg-white px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <span className="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary">
          {icon}
        </span>
      )}
      <h3 className="type-h5">{title}</h3>
      {description && <p className="max-w-md text-[15px] text-slate-600">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
