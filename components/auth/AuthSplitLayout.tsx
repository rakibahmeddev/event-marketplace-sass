import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TenantLogo } from '@/components/site/TenantLogo';

/** Login / register: photo panel on the left (desktop), form on the right; site header on mobile (design 11). */
export function AuthSplitLayout({ tenantName, children }: { tenantName: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[repeating-linear-gradient(135deg,#231E38_0_14px,#2A2442_14px_28px)] p-10 text-white lg:flex">
        <TenantLogo name={tenantName} tone="light" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 text-center font-mono text-[11px] font-medium text-[#9C94BF]"
        >
          [ crowd photo ]
        </span>
        <div className="flex flex-col gap-3">
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
