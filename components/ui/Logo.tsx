import Image from 'next/image';
import Link from 'next/link';
import { faTicket } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type Props = {
  /** Tenant display name (tenants/{id}.branding.name). */
  name: string;
  href?: string;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md';
  suffix?: string;
  /** Uploaded logo (Admin → Settings). Replaces the mark + wordmark. */
  logoUrl?: string | null;
  className?: string;
};

/** Uploaded tenant logo, or the default mark + wordmark with the coral full stop. */
export function Logo({ name, href = '/', tone = 'dark', size = 'md', suffix, logoUrl, className }: Props) {
  if (logoUrl) {
    return (
      <Link
        href={href}
        className={cn('flex items-center rounded-input focus-ring', className)}
        aria-label={`${name} home`}
      >
        <span
          className={cn(
            'relative block',
            size === 'md' ? 'h-9 w-[150px]' : 'h-8 w-[130px]',
            // Dark surfaces (footer, sidebar): a white plate keeps dark logos visible.
            tone === 'light' && 'rounded-lg bg-white px-2',
          )}
        >
          <Image
            src={logoUrl}
            alt={name}
            fill
            sizes="150px"
            loading="eager"
            className="object-contain object-left"
          />
        </span>
      </Link>
    );
  }
  const content = (
    <>
      <span
        className={cn(
          'grid shrink-0 place-items-center bg-primary text-white',
          size === 'md' ? 'size-[34px] rounded-input' : 'size-[30px] rounded-[9px]',
        )}
      >
        <Icon icon={faTicket} className={cn('-rotate-25', size === 'md' ? 'text-[15px]' : 'text-[13px]')} />
      </span>
      <span
        className={cn(
          'font-display leading-none font-extrabold tracking-[-0.03em]',
          size === 'md' ? 'text-[21px]' : 'text-lg',
          tone === 'dark' ? 'text-ink' : 'text-white',
        )}
      >
        {name}
        <span className="text-accent">.</span>
        {suffix && <> {suffix}</>}
      </span>
    </>
  );
  return (
    <Link
      href={href}
      className={cn('flex items-center gap-[9px] rounded-input focus-ring', className)}
      aria-label={`${name} home`}
    >
      {content}
    </Link>
  );
}
