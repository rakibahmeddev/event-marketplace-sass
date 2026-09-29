import type { ComponentProps, ReactNode } from 'react';
import { faChevronDown, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type FieldProps = {
  /** id of the control inside; used to wire label, hint and error. */
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  disabled?: boolean;
  labelAction?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + hint/error. Pass `aria-describedby={describedBy(id, …)}` to the control. */
export function Field({
  id,
  label,
  required,
  hint,
  error,
  disabled,
  labelAction,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className={cn('text-sm font-semibold', disabled && 'text-slate-400')}>
          {label}
          {required && <span aria-hidden> *</span>}
        </label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

const control =
  'w-full rounded-input border-[1.5px] border-line-strong bg-white px-3.5 text-[15px] text-ink placeholder:text-slate-400 transition-[border-color,box-shadow] outline-none focus:border-primary focus:shadow-[0_0_0_4px_var(--brand-primary-100)] disabled:border-line-soft disabled:bg-mist disabled:text-slate-400 aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_4px_var(--color-danger-bg)]';

type InputProps = ComponentProps<'input'> & {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
  inputSize?: 'md' | 'lg';
};

export function Input({ invalid, leadingIcon, trailing, inputSize = 'md', className, ...rest }: InputProps) {
  const height = inputSize === 'lg' ? 'h-[52px] rounded-lg text-base' : 'h-12';
  if (!leadingIcon && !trailing && !invalid) {
    return <input className={cn(control, height, className)} {...rest} />;
  }
  return (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-slate-500">
          {leadingIcon}
        </span>
      )}
      <input
        aria-invalid={invalid || undefined}
        className={cn(
          control,
          height,
          !!leadingIcon && 'pl-10',
          (!!trailing || !!invalid) && 'pr-10',
          className,
        )}
        {...rest}
      />
      <span className="absolute inset-y-0 right-3.5 grid place-items-center">
        {/* A control in the trailing slot (e.g. show-password) wins over the error icon; the red border still shows the error. */}
        {trailing ?? (invalid ? <Icon icon={faCircleExclamation} className="text-danger" /> : null)}
      </span>
    </div>
  );
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select className={cn(control, 'h-12 appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <Icon
        icon={faChevronDown}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs text-slate-500"
      />
    </div>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 py-3 leading-6', className)} {...rest} />;
}
