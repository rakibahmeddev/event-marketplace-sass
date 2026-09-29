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
  className?: string;
};

/** Brand mark + wordmark with the coral full stop. Tenant logo images arrive with branding settings (Phase 6). */
export function Logo({ name, href = '/', tone = 'dark', size = 'md', suffix, className }: Props) {
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
