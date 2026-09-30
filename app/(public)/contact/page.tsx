import type { Metadata } from 'next';
import Link from 'next/link';
import { faStore, faTicket } from '@fortawesome/free-solid-svg-icons';
import { ContactForm } from '@/components/contact/ContactForm';
import { Icon } from '@/components/ui/Icon';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Contact' };

export default async function ContactPage() {
  const tenant = await requireTenant();
  const email = tenant.supportEmail ?? null;
  return (
    <div className="bg-mist">
      <div className="page-container grid items-start gap-12 py-14 md:py-[72px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[32px] leading-10 font-extrabold tracking-[-0.03em] md:text-5xl md:leading-[56px]">
            How can we help?
          </h1>
          <p className="text-[17px] leading-[27px] text-slate-600">
            Questions about a ticket? Contacting the organizer is usually fastest — find their details on your
            ticket or event page.
          </p>
          <div className="mt-2 flex flex-col gap-3">
            <div className="flex gap-3.5 rounded-[14px] border border-line-soft bg-white p-[18px]">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <Icon icon={faTicket} />
              </span>
              <div>
                <b className="text-[15px]">Attendee support</b>
                <div className="text-sm text-slate-600">
                  {email ? (
                    <a href={`mailto:${email}`} className="text-primary hover:underline">
                      {email}
                    </a>
                  ) : (
                    'Coming soon'
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3.5 rounded-[14px] border border-line-soft bg-white p-[18px]">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
                <Icon icon={faStore} />
              </span>
              <div>
                <b className="text-[15px]">Selling tickets?</b>
                <div className="text-sm text-slate-600">
                  See{' '}
                  <Link href="/become-an-organizer" className="text-primary hover:underline">
                    how to become an organizer
                  </Link>
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
        <ContactForm supportEmail={email} />
      </div>
    </div>
  );
}
