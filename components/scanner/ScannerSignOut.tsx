'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { logout } from '@/lib/auth/client';
import { getClientAuth } from '@/lib/firebase/client';

/** Ends the server session and the scanner's persistent Firebase sign-in. */
export function ScannerSignOut({ authTenantId }: { authTenantId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label="Log out"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await Promise.allSettled([logout(), signOut(getClientAuth(authTenantId))]);
        router.replace('/scanner/login');
        router.refresh();
      }}
      className="grid size-11 place-items-center rounded-full text-slate-500 hover:text-ink disabled:opacity-60 focus-ring"
    >
      <Icon icon={faArrowRightFromBracket} />
    </button>
  );
}
