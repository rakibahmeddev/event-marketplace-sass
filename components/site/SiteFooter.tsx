import Link from 'next/link';
import {
  faCcAmex,
  faCcApplePay,
  faCcMastercard,
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
import { TenantLogo } from '@/components/site/TenantLogo';
import { listCategories } from '@/lib/categories/repository';
import { getCurrentTenant } from '@/lib/tenant/current';
import type { SocialNetwork } from '@/lib/tenant/settings';
import { footerColumns, type FooterLink } from './nav';

// Admin → Settings → social links. Only networks with a link are shown.
const socialNetworks: { key: SocialNetwork; icon: typeof faInstagram; label: string }[] = [
  { key: 'instagram', icon: faInstagram, label: 'Instagram' },
  { key: 'tiktok', icon: faTiktok, label: 'TikTok' },
  { key: 'x', icon: faXTwitter, label: 'X' },
  { key: 'facebook', icon: faFacebookF, label: 'Facebook' },
  { key: 'youtube', icon: faYoutube, label: 'YouTube' },
];
// Card brands accepted through Stripe (PayPal is deferred).
const payments = [faCcVisa, faCcMastercard, faCcAmex, faCcApplePay, faCcStripe];
const DEFAULT_TAGLINE =
  'The marketplace for live experiences. Discover events near you, or sell tickets to your own.';

function SocialLinks({
  links,
  size,
}: {
  links: { href: string; icon: typeof faInstagram; label: string }[];
  size: string;
}) {
  if (!links.length) return null;
  return (
    <div className="flex gap-2.5">
      {links.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className={`grid ${size} place-items-center rounded-full bg-ink-800 text-white hover:bg-primary focus-ring`}
        >
          <Icon icon={s.icon} />
        </a>
      ))}
    </div>
  );
}

function FooterItem({ link }: { link: FooterLink }) {
  return link.href ? (
    <Link href={link.href} className="hover:text-white">
      {link.label}
    </Link>
  ) : (
    <span>{link.label}</span>
  );
}

export async function SiteFooter({ tenantName }: { tenantName: string }) {
  const year = new Date().getFullYear();
  const tenant = await getCurrentTenant();
  const socials = socialNetworks
    .filter((n) => tenant?.socialLinks[n.key])
    .map((n) => ({ href: tenant!.socialLinks[n.key]!, icon: n.icon, label: n.label }));
  const tagline = tenant?.footerTagline || DEFAULT_TAGLINE;
  const categories = tenant ? await listCategories(tenant.id) : [];
  const columns = [
    {
      title: 'Discover',
      links: [
        ...categories.slice(0, 8).map((c) => ({ label: c.name, href: `/events?category=${c.id}` })),
        { label: 'All events', href: '/events' },
      ],
    },
    ...footerColumns,
  ];
  return (
    <footer className="bg-ink text-ink-muted">
      {/* Desktop */}
      <div className="page-container hidden pt-16 pb-8 md:block">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 flex flex-col gap-[18px] lg:col-span-4">
            <TenantLogo name={tenantName} tone="light" />
            <p className="max-w-[300px] text-sm leading-[22px]">{tagline}</p>
            <SocialLinks links={socials} size="size-10" />
          </div>
          {columns.map((col) => (
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
        <TenantLogo name={tenantName} tone="light" size="sm" />
        <div className="flex flex-col">
          {columns.map((col) => (
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
        <SocialLinks links={socials} size="size-11" />
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
