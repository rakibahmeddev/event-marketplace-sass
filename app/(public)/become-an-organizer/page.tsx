import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import {
  faBolt,
  faChartLine,
  faCheck,
  faLayerGroup,
  faQrcode,
  faShieldHalved,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { BecomeOrganizerFlow, type FlowState } from '@/components/organizers/BecomeOrganizerFlow';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getSessionUser } from '@/lib/auth/session';
import { listCategories } from '@/lib/categories/repository';
import { getOrganizerForOwner } from '@/lib/organizers/repository';
import { storagePaths } from '@/lib/storage/server';
import { STOCK } from '@/lib/images/stock';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Sell tickets' };

// Copy is limited to what the MVP actually does (see docs/deferred.md).
const benefits = [
  {
    icon: faWandMagicSparkles,
    t: 'Event page in minutes',
    d: 'Photos, description, venue and refund policy — a page that sells, without a designer.',
  },
  {
    icon: faLayerGroup,
    t: 'Flexible ticket tiers',
    d: 'Early bird, general admission, VIP — each with its own price, quantity and sales window.',
  },
  {
    icon: faQrcode,
    t: 'QR check-in',
    d: 'Give door staff their own login and scan tickets with any phone camera.',
  },
  {
    icon: faShieldHalved,
    t: 'Secure payments',
    d: 'Card payments through Stripe. We never see or store card numbers.',
  },
  {
    icon: faChartLine,
    t: 'Live sales overview',
    d: 'See tickets sold and check-ins for every event in your dashboard.',
  },
  {
    icon: faBolt,
    t: 'Tickets by email',
    d: 'Buyers get QR tickets instantly by email and in their account.',
  },
];

export default async function BecomeOrganizerPage() {
  const tenant = await requireTenant();
  const [user, categories, host] = await Promise.all([
    getSessionUser(),
    listCategories(tenant.id),
    headers().then((h) => h.get('host') ?? ''),
  ]);
  const existing = user ? await getOrganizerForOwner(tenant.id, user.uid) : null;
  const commission = `${Math.round(tenant.commissionRate * 1000) / 10}%`;

  let state: FlowState;
  if (!user)
    state = {
      kind: 'signed-out',
      register: (
        <div className="flex flex-col gap-3.5">
          <h3 className="font-display text-2xl font-extrabold">Step 1 · Your account</h3>
          <Suspense>
            <RegisterForm authTenantId={tenant.authTenantId} redirectTo="/become-an-organizer#register" />
          </Suspense>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link href="/login?next=/become-an-organizer%23register" className="font-semibold text-primary">
              Log in to continue
            </Link>
          </p>
        </div>
      ),
    };
  else if (existing?.status === 'pending') state = { kind: 'pending' };
  else if (existing?.status === 'approved' && user.role === 'organizer') state = { kind: 'approved' };
  else if (existing?.status === 'approved')
    state = { kind: 'pending' }; // approved, awaiting fresh sign-in
  else if (existing?.status === 'suspended') state = { kind: 'suspended' };
  else if (user.role !== 'attendee') state = { kind: 'other-role' };
  else
    state = {
      kind: 'apply',
      authTenantId: tenant.authTenantId,
      logoFolder: storagePaths.applicationLogo(tenant.id, user.uid),
      host,
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    };

  return (
    <>
      <section className="bg-ink text-white">
        <div className="page-container grid items-center gap-12 py-14 md:py-[88px] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="flex flex-col gap-[22px]">
            <span className="text-[13px] font-bold tracking-[0.1em] text-[#FF8E73] uppercase">
              For event organizers
            </span>
            <h1 className="font-display text-[36px] leading-[44px] font-extrabold tracking-[-0.035em] text-pretty md:text-6xl md:leading-[66px]">
              Sell out your next event. Keep the crowd coming back.
            </h1>
            <p className="max-w-[560px] text-base text-ink-muted md:text-[19px] md:leading-[30px]">
              Create your event page, sell tickets and scan guests in with your phone — all from one
              dashboard. Free to start.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-3">
              <ButtonLink href="#register" variant="accent" size="lg">
                Start selling — it’s free
              </ButtonLink>
            </div>
          </div>
          <div className="relative hidden h-[440px] overflow-hidden rounded-sheet bg-primary lg:block">
            <Image
              src={STOCK.productOrganizer}
              alt="The organizer dashboard with ticket sales, next to the phone scanner checking a ticket in"
              fill
              sizes="(min-width: 1280px) 600px, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="page-container flex flex-col gap-10 py-14 md:py-[88px]">
        <h2 className="type-h2 text-center">Everything you need to run the door</h2>
        <div className="grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.t} className="flex flex-col gap-3 rounded-card border border-line-soft p-7">
              <span className="grid size-[52px] place-items-center rounded-[14px] bg-primary-50 text-xl text-primary">
                <Icon icon={b.icon} />
              </span>
              <b className="font-display text-[19px] font-bold">{b.t}</b>
              <span className="text-[15px] leading-6 text-slate-600">{b.d}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-20 bg-mist">
        <div className="page-container flex flex-col gap-10 py-14 md:py-[88px]">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="type-h2">Simple, transparent pricing</h2>
            <p className="text-[17px] text-slate-600">No monthly fees. We only earn when you sell.</p>
          </div>
          <div className="grid items-stretch gap-6 md:grid-cols-3">
            <Plan
              name="Free events"
              price="$0"
              note="No fees on free tickets, ever."
              items={['Unlimited events', 'QR check-in', 'Attendee list']}
            />
            <Plan
              featured
              name="Paid events"
              price={commission}
              note="Per paid ticket, calculated at checkout."
              items={[
                'Everything in Free',
                'Card payments via Stripe',
                'Early bird & VIP tiers',
                'Unlimited check-in staff',
              ]}
            />
            <Plan
              name="Large venues"
              price="Custom"
              note="For high-volume organizers and multi-room venues."
              items={['Reduced commission', 'Dedicated contact']}
              action={
                tenant.supportEmail ? (
                  <a
                    href={`mailto:${tenant.supportEmail}?subject=${encodeURIComponent('Organizer pricing')}`}
                    className="mt-auto grid h-12 place-items-center rounded-input border-[1.5px] border-line-strong text-[15px] font-semibold hover:bg-mist focus-ring"
                  >
                    Talk to us
                  </a>
                ) : null
              }
            />
          </div>
        </div>
      </section>

      <section id="register" className="page-container scroll-mt-20 py-14 md:py-[88px]">
        <BecomeOrganizerFlow state={state} />
      </section>
    </>
  );
}

function Plan({
  name,
  price,
  note,
  items,
  featured,
  action,
}: {
  name: string;
  price: string;
  note: string;
  items: string[];
  featured?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={
        featured
          ? 'relative flex flex-col gap-4 rounded-panel bg-primary p-8 text-white shadow-[0_20px_40px_color-mix(in_srgb,var(--brand-primary)_30%,transparent)]'
          : 'flex flex-col gap-4 rounded-panel border border-line-soft bg-white p-8'
      }
    >
      {featured && (
        <span className="absolute top-5 right-5 flex h-[26px] items-center rounded-full bg-accent px-2.5 text-xs font-bold text-ink">
          Most popular
        </span>
      )}
      <b className="font-display text-lg font-bold">{name}</b>
      <div className="font-display text-5xl leading-none font-extrabold">{price}</div>
      <span className={featured ? 'text-[15px] text-primary-100' : 'text-[15px] text-slate-600'}>{note}</span>
      <ul className="mt-2 flex flex-col gap-2.5 text-[15px]">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-2.5">
            <Icon icon={faCheck} className={featured ? '' : 'text-success'} />
            {i}
          </li>
        ))}
      </ul>
      {action}
    </div>
  );
}
