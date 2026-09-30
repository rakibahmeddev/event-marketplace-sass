'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/auth/next-path';

/** After sign-in: go to ?next= (same-site paths only) and re-render server components with the new session. */
export function useAfterSignIn(redirectTo?: string) {
  const router = useRouter();
  const params = useSearchParams();
  return (override?: string) => {
    router.replace(safeNextPath(override ?? redirectTo ?? params.get('next')));
    router.refresh();
  };
}
