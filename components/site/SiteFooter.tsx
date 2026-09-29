import Link from 'next/link';
import {
  faCcAmex,
  faCcApplePay,
  faCcMastercard,
  faCcPaypal,
  faCcStripe,
  faCcVisa,
  faFacebookF,
  faInstagram,
  faTiktok,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { footerColumns, type FooterLink } from './nav';

// Social profile URLs become tenant settings in Phase 6; until then the icons are decorative.
const socials = [
  { icon: faInstagram, label: 'Instagram' },
  { icon: faTiktok, label: 'TikTok' },
  { icon: faXTwitter, label: 'X' },
  { icon: faFacebookF, label: 'Facebook' },
  { icon: faYoutube, label: 'YouTube' },
];
const payments = [faCcVisa, faCcMastercard, faCcAmex, faCcPaypal, faCcApplePay, faCcStripe];

function FooterItem({ link }: { link: FooterLink }) {
  return link.href ? (
    <Link href={link.href} className="hover:text-white">
      {link.label}
    </Link>
  ) : (
    <span>{link.label}</span>
  );
}

export function SiteFooter({ tenantName }: { tenantName: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink text-ink-muted">
      {/* Desktop */}
      <div className="page-container hidden pt-16 pb-8 md:block">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex flex-col gap-[18px] lg:col-span-4">
            <Logo name={tenantName} tone="light" />
            <p className="max-w-[300px] text-sm leading-[22px]">
              The marketplace for live experiences. Discover events near you, or sell tickets to your own.
            </p>
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <span
                  key={s.label}
                  className="grid size-10 place-items-center rounded-full bg-ink-800 text-white"
                >
                  <Icon icon={s.icon} label={s.label} />
                </span>
              ))}
            </div>
          </div>
          {footerColumns.map((col) => (
            <div key={col.title} className="col-span-3 flex flex-col gap-3 text-sm lg:col-span-2">
              <h2 className="mb-1 font-display text-[13px] font-bold tracking-[0.06em] text-white uppercase">
                {col.title}
              </h2>
              {col.links.map((l) => (
                <FooterItem key={l.label} link={l} />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-14 flex items-center justify-between gap-6 border-t border-ink-700 pt-6 text-[13px]">
          <span>
            © {year} {tenantName}. All rights reserved.
          </span>
          <div className="flex items-center gap-3.5 text-[28px] text-white">
            {payments.map((p) => (
              <Icon key={p.iconName} icon={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-6 px-5 pt-10 pb-7 md:hidden">
        <Logo name={tenantName} tone="light" size="sm" />
        <div className="flex flex-col">
          {footerColumns.map((col) => (
            <details key={col.title} className="group border-b border-ink-700">
              <summary className="flex h-[52px] cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-white [&::-webkit-details-marker]:hidden">
                {col.title}
                <Icon icon={faChevronDown} className="text-xs transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-3 pb-4 text-sm">
                {col.links.map((l) => (
                  <FooterItem key={l.label} link={l} />
                ))}
              </div>
            </details>
          ))}
        </div>
        <div className="flex gap-2.5">
          {socials.slice(0, 4).map((s) => (
            <span
              key={s.label}
              className="grid size-11 place-items-center rounded-full bg-ink-800 text-white"
            >
              <Icon icon={s.icon} label={s.label} />
            </span>
          ))}
        </div>
        <div className="flex gap-3 text-[26px] text-white">
          {payments.slice(0, 5).map((p) => (
            <Icon key={p.iconName} icon={p} />
          ))}
        </div>
        <span className="text-xs">
          © {year} {tenantName}
        </span>
      </div>
    </footer>
  );
}
