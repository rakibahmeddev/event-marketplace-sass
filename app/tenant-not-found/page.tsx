import type { Metadata } from 'next';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = { title: 'Marketplace not found', robots: { index: false } };

/** Shown (with HTTP 404) when the hostname is not a known, active tenant. No tenant branding is available here. */
export default function TenantNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid size-16 place-items-center rounded-panel bg-primary-50 text-2xl text-primary">
        <Icon icon={faStore} />
      </span>
      <h1 className="type-h3">Marketplace not found</h1>
      <p className="max-w-md text-[15px] text-slate-600">
        There’s no active marketplace at this address. Check the link, or contact the organizer who shared it.
      </p>
    </main>
  );
}
