import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Props = {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, delta, note, icon, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-[14px] border border-line-soft bg-white p-3.5 md:gap-3 md:rounded-card md:p-5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600 md:text-sm">{label}</span>
        {icon && (
          <span className="hidden size-[38px] place-items-center rounded-input bg-primary-50 text-primary md:grid">
            {icon}
          </span>
        )}
      </div>
      <b className="font-display text-[22px] leading-none font-extrabold md:text-[30px]">{value}</b>
      {(delta || note) && (
        <span className="text-xs font-semibold text-success md:text-[13px]">
          {delta} {note && <span className="font-normal text-slate-500">{note}</span>}
        </span>
      )}
    </div>
  );
}
