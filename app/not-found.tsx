import { faTicket } from '@fortawesome/free-solid-svg-icons';
import { SiteHeader } from '@/components/site/SiteHeader';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

// Design 11 · 404 (desktop 1280 / mobile 375)
export default async function NotFound() {
  const { name } = await getCurrentTenantBranding();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader tenantName={name} />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center md:gap-5 md:p-10">
        <p
          aria-hidden
          className="flex items-center font-display text-[96px] leading-none font-extrabold tracking-[-0.06em] md:text-[180px]"
        >
          4
          <span className="mx-1 grid size-20 -rotate-12 place-items-center rounded-[20px] bg-primary text-[34px] text-white md:mx-2 md:size-[150px] md:rounded-[32px] md:text-[64px]">
            <Icon icon={faTicket} />
          </span>
          4
        </p>
        <h1 className="font-display text-[26px] leading-[34px] font-extrabold md:text-4xl md:leading-[44px] md:tracking-[-0.02em]">
          This page left before the encore.
        </h1>
        <p className="max-w-[480px] text-[15px] leading-[23px] text-slate-600 md:text-[17px] md:leading-[27px]">
          The event may have ended or the link is broken.
          <span className="hidden md:inline"> Let’s find you something else to go to.</span>
        </p>
        <div className="mt-2 flex w-full flex-col gap-4 md:mt-0 md:w-auto md:flex-row md:gap-3">
          <ButtonLink href="/events" size="lg" className="md:h-12 md:rounded-input md:px-6 md:text-[15px]">
            Browse events
          </ButtonLink>
          <ButtonLink
            href="/"
            variant="secondary"
            size="lg"
            className="md:h-12 md:rounded-input md:px-6 md:text-[15px]"
          >
            Back to home
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
