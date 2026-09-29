import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export function Table({ className, ...rest }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto rounded-card border border-line-soft bg-white">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...rest} />
    </div>
  );
}

export function THead({ className, ...rest }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-mist', className)} {...rest} />;
}

export function TBody({ className, ...rest }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:nth-child(even)]:bg-row-alt', className)} {...rest} />;
}

export function TR({ className, ...rest }: ComponentProps<'tr'>) {
  return <tr className={cn('border-t border-line-soft first:border-t-0', className)} {...rest} />;
}

export function TH({ className, ...rest }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-5 py-3 text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-slate-500 uppercase',
        className,
      )}
      {...rest}
    />
  );
}

export function TD({ className, ...rest }: ComponentProps<'td'>) {
  return <td className={cn('px-5 py-3.5 align-middle', className)} {...rest} />;
}
