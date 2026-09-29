import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'dark';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[background-color,box-shadow,border-color,color] duration-150 outline-none select-none disabled:pointer-events-none aria-disabled:pointer-events-none';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover hover:shadow-primary-glow focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--brand-primary)] disabled:bg-line disabled:text-slate-400 aria-disabled:bg-line aria-disabled:text-slate-400',
  secondary:
    'bg-white text-ink border-[1.5px] border-line-strong hover:bg-mist hover:border-ink focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--brand-primary)] disabled:border-line-soft disabled:text-slate-300 aria-disabled:border-line-soft aria-disabled:text-slate-300',
  // Coral is reserved for organizer CTAs. Ink text keeps 6.6:1 contrast.
  accent:
    'bg-accent text-ink font-bold hover:bg-accent-hover focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-ink)] disabled:bg-accent-100 disabled:text-[#C79A8F] aria-disabled:bg-accent-100 aria-disabled:text-[#C79A8F]',
  ghost:
    'text-primary hover:bg-primary-50 hover:text-primary-hover focus-visible:shadow-[0_0_0_2px_var(--brand-primary)] disabled:text-slate-300 aria-disabled:text-slate-300',
  dark: 'bg-ink text-white hover:bg-ink-800 focus-visible:shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-ink)] disabled:bg-line disabled:text-slate-400',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-[18px] text-sm rounded-input',
  md: 'h-12 px-6 text-[15px] leading-5 rounded-input',
  lg: 'h-14 px-7 text-base rounded-lg',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
};

type ButtonProps = SharedProps &
  ComponentProps<'button'> & {
    loading?: boolean;
    /** Text shown while loading, e.g. "Processing". Defaults to children. */
    loadingText?: ReactNode;
  };

export function Button({
  variant,
  size,
  fullWidth,
  leadingIcon,
  trailingIcon,
  loading,
  loadingText,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({
        variant,
        size,
        fullWidth,
        className: cn(loading && 'opacity-85 disabled:bg-primary disabled:text-white', className),
      })}
      {...rest}
    >
      {loading ? <Icon icon={faCircleNotch} className="animate-spin" /> : leadingIcon}
      {loading ? (loadingText ?? children) : children}
      {!loading && trailingIcon}
    </button>
  );
}

type ButtonLinkProps = SharedProps & ComponentProps<typeof Link>;

/** A link styled as a button (navigation, not actions). */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </Link>
  );
}

type IconButtonProps = ComponentProps<'button'> & {
  label: string;
  icon: ReactNode;
  tone?: 'outline' | 'plain';
};

/** 44×44 minimum touch target. */
export function IconButton({
  label,
  icon,
  tone = 'outline',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-grid size-11 shrink-0 place-items-center rounded-full text-ink transition-colors focus-ring',
        tone === 'outline' ? 'border-[1.5px] border-line-strong bg-white hover:bg-mist' : 'hover:bg-mist',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
