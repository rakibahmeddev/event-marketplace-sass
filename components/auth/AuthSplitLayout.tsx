import type { ReactNode } from 'react';
import Image from 'next/image';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TenantLogo } from '@/components/site/TenantLogo';
import { STOCK } from '@/lib/images/stock';

/** Login / register: photo panel on the left (desktop), form on the right; site header on mobile (design 11). */
export function AuthSplitLayout({ tenantName, children }: { tenantName: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
        <Image
          src={STOCK.aboutCrowd}
          alt=""
          fill
          sizes="50vw"
          loading="eager"
          fetchPriority="high"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(26_26_46/0.55)_0%,rgb(26_26_46/0.1)_40%,rgb(26_26_46/0.85)_100%)]" />
        <TenantLogo name={tenantName} tone="light" className="relative" />
        <div className="relative flex flex-col gap-3">
          <b className="font-display text-[40px] leading-[48px] font-extrabold tracking-[-0.02em]">
            Your tickets, all in one place.
          </b>
          <span className="text-[17px] text-[#D9D6E8]">Get your QR tickets anywhere, on any device.</span>
        </div>
      </div>
      <div className="flex flex-col">
        <div className="lg:hidden">
          <SiteHeader tenantName={tenantName} />
        </div>
        <div className="flex flex-1 justify-center px-5 py-6 lg:items-center lg:p-10">
          <div className="flex w-full max-w-[420px] flex-col gap-[18px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
