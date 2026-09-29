import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { faCalendar, faHeart } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowRight,
  faCircleCheck,
  faDollarSign,
  faFire,
  faMagnifyingGlass,
  faQrcode,
  faShareNodes,
  faTicket,
  faVideo,
} from '@fortawesome/free-solid-svg-icons';
import { CategoryTile } from '@/components/events/CategoryTile';
import { CityTile } from '@/components/events/CityTile';
import { EventCard } from '@/components/events/EventCard';
import { OrganizerCard } from '@/components/organizers/OrganizerCard';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TicketCard } from '@/components/tickets/TicketCard';
import { AccordionItem } from '@/components/ui/Accordion';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, OrderStatusBadge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Checkbox, Radio, Switch } from '@/components/ui/Choice';
import { DateBadge } from '@/components/ui/DateBadge';
import { describedBy, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Pagination } from '@/components/ui/Pagination';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { StatCard } from '@/components/ui/StatCard';
import { Stepper } from '@/components/ui/Stepper';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { SegmentedTabs, Tabs } from '@/components/ui/Tabs';
import { sampleCategories, sampleEvents, sampleOrganizers, sampleTicket } from '@/lib/dev/sample-data';

export const metadata: Metadata = { title: 'Style guide', robots: { index: false } };

function Section({
  n,
  title,
  children,
  muted,
}: {
  n: string;
  title: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section className={muted ? 'border-b border-line-soft bg-mist' : 'border-b border-line-soft'}>
      <div className="page-container flex flex-col gap-7 py-14">
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-[13px] font-semibold text-primary">{n}</span>
          <h2 className="font-display text-[32px] leading-10 font-extrabold">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

const swatches = [
  ['Primary · Violet', 'bg-primary', '#5B2EE0'],
  ['Accent · Coral', 'bg-accent', '#FF6B4A'],
  ['Text · Ink', 'bg-ink', '#1A1A2E'],
  ['Surface · Mist', 'bg-mist', '#F7F7F9'],
  ['Violet 700', 'bg-primary-hover', '#4A22C4'],
  ['Violet 100', 'bg-primary-100', '#E2D8FF'],
  ['Violet 50', 'bg-primary-50', '#F1ECFF'],
  ['Coral 100', 'bg-accent-100', '#FFE3DB'],
  ['Slate 600', 'bg-slate-600', '#4B4B63'],
  ['Slate 500', 'bg-slate-500', '#6B6B80'],
  ['Line', 'bg-line', '#E4E4EB'],
  ['White', 'bg-white', '#FFFFFF'],
] as const;

const typeScale = [
  ['H1 56/64 · 800', 'type-h1', 'Live it loud'],
  ['H2 40/48 · 800', 'type-h2', 'Trending this week'],
  ['H3 32/40 · 700', 'type-h3', 'Browse by city'],
  ['H4 24/32 · 700', 'type-h4', 'About this event'],
  ['H5 20/28 · 700', 'type-h5', 'General Admission'],
  ['H6 16/24 · 700', 'type-h6', 'Refund policy'],
  [
    'Body L 18/28',
    'type-body-lg text-slate-600',
    'Discover concerts, workshops and nights out happening near you.',
  ],
  ['Body 16/24', 'type-body', 'Doors open at 7:00 PM. Bring a valid photo ID for 21+ entry.'],
  ['Small 14/20', 'type-small text-slate-600', 'Sat, Oct 3 · 8:00 PM · Harbor Hall, Brooklyn'],
  ['Caption 12/16', 'type-caption text-primary', 'Music concerts'],
] as const;

/** Dev-only component showcase mirroring design/01 Style Guide. Not served in production. */
export default function StyleGuidePage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="bg-white">
      <SiteHeader tenantName="brandname" cartCount={2} />

      <section className="bg-ink text-white">
        <div className="page-container flex flex-col gap-4 py-16">
          <span className="text-[13px] font-semibold tracking-[0.12em] text-[#FF8E73] uppercase">
            Design system v1.0
          </span>
          <h1 className="type-h1">
            brandname<span className="text-accent">.</span> style guide
          </h1>
          <p className="type-body-lg max-w-[640px] text-ink-muted">
            One violet for action, one coral for urgency, and calm neutrals so event photography does the
            talking.
          </p>
        </div>
      </section>

      <Section n="01" title="Color palette">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {swatches.map(([name, cls, hex]) => (
            <div key={name} className="overflow-hidden rounded-card border border-line-soft">
              <div className={`h-20 ${cls}`} />
              <div className="flex flex-col px-4 py-3">
                <b className="font-display text-sm">{name}</b>
                <span className="font-mono text-xs text-slate-600">{hex}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Alert tone="success" title="Success">
            #12805C / #E6F6EF · Valid ticket
          </Alert>
          <Alert tone="warning" title="Warning">
            #D97706 / #FFF1DE · Already used
          </Alert>
          <Alert tone="danger" title="Danger">
            #C8281E / #FDECEA · Invalid, errors
          </Alert>
        </div>
      </Section>

      <Section n="02" title="Typography">
        <div className="flex flex-col border-t border-line-soft">
          {typeScale.map(([label, cls, sample]) => (
            <div
              key={label}
              className="grid items-baseline gap-4 border-b border-line-soft py-3.5 md:grid-cols-[140px_1fr]"
            >
              <span className="font-mono text-xs text-slate-500">{label}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section n="03" title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Get tickets</Button>
          <Button disabled>Get tickets</Button>
          <Button loading loadingText="Processing">
            Get tickets
          </Button>
          <Button variant="secondary">Follow</Button>
          <Button variant="secondary" loading loadingText="Saving">
            Follow
          </Button>
          <Button variant="accent">Create event</Button>
          <Button variant="accent" disabled>
            Create event
          </Button>
          <ButtonLink
            href="/events"
            variant="ghost"
            trailingIcon={<Icon icon={faArrowRight} className="text-[13px]" />}
          >
            View all
          </ButtonLink>
          <Button variant="dark">Follow</Button>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Large · 56</Button>
          <Button size="md">Medium · 48</Button>
          <Button size="sm">Small · 40</Button>
          <IconButton label="Save" icon={<Icon icon={faHeart} />} />
          <IconButton label="Share" icon={<Icon icon={faShareNodes} />} />
        </div>
      </Section>

      <Section n="04" title="Form inputs">
        <div className="grid gap-6 md:grid-cols-3">
          <Field id="sg-name" label="Full name" hint="Default">
            <Input
              id="sg-name"
              placeholder="e.g. Jordan Lee"
              aria-describedby={describedBy('sg-name', { hint: 1 })}
            />
          </Field>
          <Field id="sg-email" label="Email" required>
            <Input id="sg-email" type="email" defaultValue="jordan@mail.com" />
          </Field>
          <Field id="sg-phone" label="Phone" error="Enter a valid phone number">
            <Input
              id="sg-phone"
              invalid
              defaultValue="+1 555 01"
              aria-describedby={describedBy('sg-phone', { error: 1 })}
            />
          </Field>
          <Field id="sg-cat" label="Category">
            <Select id="sg-cat" defaultValue="music">
              <option value="music">Music Concerts</option>
              <option value="sports">Sports Events</option>
            </Select>
          </Field>
          <Field id="sg-search" label="Search">
            <Input
              id="sg-search"
              leadingIcon={<Icon icon={faMagnifyingGlass} />}
              placeholder="Name, email or ticket ID"
            />
          </Field>
          <Field id="sg-ticket" label="Ticket ID" hint="Disabled" disabled>
            <Input id="sg-ticket" disabled defaultValue="TX-2026-004821" />
          </Field>
          <Field id="sg-desc" label="Description" className="md:col-span-3">
            <Textarea id="sg-desc" placeholder="Tell attendees what to expect" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-9">
          <Checkbox label="Checkbox on" defaultChecked />
          <Checkbox label="Checkbox off" />
          <Radio label="Radio on" name="sg-radio" defaultChecked />
          <Radio label="Radio off" name="sg-radio" />
          <Switch label="Toggle" defaultChecked />
          <QuantityStepper label="General Admission quantity" defaultValue={2} max={8} />
        </div>
      </Section>

      <Section n="05" title="Badges, chips & date badges">
        <div className="flex flex-wrap gap-2.5">
          <Badge tone="accent" icon={<Icon icon={faFire} />}>
            Selling fast
          </Badge>
          <Badge tone="dark">Sold out</Badge>
          <Badge tone="success">Free</Badge>
          <Badge tone="info" icon={<Icon icon={faVideo} />}>
            Online
          </Badge>
          <Badge tone="warning">Only 12 left</Badge>
          <Badge tone="primary" icon={<Icon icon={faCircleCheck} />}>
            Verified
          </Badge>
          <Badge tone="danger">Cancelled</Badge>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Chip state="selected" icon={<Icon icon={sampleCategories[0]!.icon} />}>
            Music
          </Chip>
          <Chip icon={<Icon icon={sampleCategories[1]!.icon} />}>Sports</Chip>
          <Chip icon={<Icon icon={sampleCategories[2]!.icon} />}>Workshops</Chip>
          <Chip state="active" removable icon={<Icon icon={sampleCategories[6]!.icon} />}>
            Comedy
          </Chip>
        </div>
        <div className="flex items-center gap-4">
          <DateBadge month="OCT" day="03" />
          <DateBadge month="OCT" day="17" variant="filled" />
        </div>
      </Section>

      <Section n="06" title="Event cards" muted>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sampleEvents.map((e) => (
            <EventCard key={e.href} event={e} />
          ))}
        </div>
        <EventCard event={sampleEvents[3]!} layout="list" />
        <EventCard event={sampleEvents[0]!} layout="list" />
      </Section>

      <Section n="07" title="Tiles & organizers">
        <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
          {sampleCategories.map((c) => (
            <CategoryTile key={c.name} name={c.name} icon={c.icon} href="/events" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <CityTile name="New York" count="2,140 events" href="/events" />
          <CityTile name="Chicago" count="980 events" href="/events" />
          {sampleOrganizers.slice(0, 1).map((o) => (
            <OrganizerCard key={o.href} organizer={o} />
          ))}
        </div>
      </Section>

      <Section n="08" title="Tables, stats & progress">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tickets sold"
            value="1,284"
            delta="+12.4%"
            note="vs last month"
            icon={<Icon icon={faTicket} />}
          />
          <StatCard
            label="Revenue"
            value="$52,480"
            delta="+8.1%"
            note="net $48,910"
            icon={<Icon icon={faDollarSign} />}
          />
          <StatCard label="Upcoming events" value="6" delta="2 this week" icon={<Icon icon={faCalendar} />} />
          <StatCard
            label="Check-ins tonight"
            value="245/500"
            delta="49%"
            note="Neon Tides"
            icon={<Icon icon={faQrcode} />}
          />
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Attendee</TH>
              <TH>Ticket</TH>
              <TH>Total</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <TBody>
            <TR>
              <TD className="font-mono">#10482</TD>
              <TD>Jordan Lee</TD>
              <TD>VIP × 2</TD>
              <TD className="font-bold">$240.00</TD>
              <TD>
                <OrderStatusBadge status="paid" />
              </TD>
            </TR>
            <TR>
              <TD className="font-mono">#10481</TD>
              <TD>Sam Ortiz</TD>
              <TD>General × 1</TD>
              <TD className="font-bold">$45.00</TD>
              <TD>
                <OrderStatusBadge status="pending" />
              </TD>
            </TR>
            <TR>
              <TD className="font-mono">#10480</TD>
              <TD>Aisha Khan</TD>
              <TD>Early Bird × 3</TD>
              <TD className="font-bold">$105.00</TD>
              <TD>
                <OrderStatusBadge status="refunded" />
              </TD>
            </TR>
          </TBody>
        </Table>
        <div className="grid gap-3 md:max-w-md">
          <span className="text-sm">Neon Tides Live · 984 / 1,200</span>
          <ProgressBar value={984} max={1200} label="Neon Tides Live tickets sold" />
          <span className="text-sm">Warehouse Sessions 13 · 340 / 800</span>
          <ProgressBar value={340} max={800} label="Warehouse Sessions tickets sold" />
        </div>
      </Section>

      <Section n="09" title="Navigation">
        <Breadcrumbs
          items={[{ label: 'Home', href: '/' }, { label: 'Events', href: '/events' }, { label: 'New York' }]}
        />
        <Tabs
          label="Event sections"
          items={[
            { label: 'About', href: '/dev/style-guide', active: true },
            { label: 'Lineup', href: '/dev/style-guide#lineup' },
            { label: 'Venue', href: '/dev/style-guide#venue' },
            { label: 'Refund policy', href: '/dev/style-guide#refunds' },
          ]}
        />
        <div className="max-w-[420px]">
          <SegmentedTabs
            label="Account"
            items={[
              { label: 'Log in', href: '/dev/style-guide', active: true },
              { label: 'Sign up', href: '/register' },
            ]}
          />
        </div>
        <Stepper steps={['Tickets', 'Details & payment', 'Confirmation']} current={1} />
        <Pagination page={1} totalPages={28} hrefFor={(p: number) => `/dev/style-guide?page=${p}`} />
        <div className="flex max-w-2xl flex-col gap-3">
          <AccordionItem question="Can I bring a bag?" defaultOpen>
            Small bags up to 12 × 6 × 12 in. are allowed and will be checked at entry.
          </AccordionItem>
          <AccordionItem question="Do I need to print my ticket?">
            No — show the QR code on your phone at the door.
          </AccordionItem>
        </div>
      </Section>

      <Section n="10" title="Avatars & ticket" muted>
        <div className="flex items-center gap-4">
          <Avatar name="Jordan Lee" size="lg" tone="soft" />
          <Avatar name="Pulse Live" size="xl" ring />
          <Avatar name="Tasha Green" />
          <Avatar name="Pulse Live" size="sm" tone="white" className="border border-line" />
        </div>
        <TicketCard ticket={sampleTicket} />
      </Section>

      <SiteFooter tenantName="brandname" />
    </div>
  );
}
