'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { authErrorMessage, loginWithEmail } from '@/lib/auth/client';
import { useAfterSignIn } from './useAuthNavigation';

type DemoAccount = { email: string; label: string; next: string };

/**
 * Local development only (rendered by the login page when talking to the emulators):
 * one-click sign-in as the seeded test accounts.
 */
export function DemoAccounts({
  authTenantId,
  password,
  accounts,
}: {
  authTenantId: string;
  password: string;
  accounts: DemoAccount[];
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const afterSignIn = useAfterSignIn();

  async function signIn(a: DemoAccount) {
    setPending(a.email);
    setError(undefined);
    try {
      await loginWithEmail(authTenantId, a.email, password, true);
      afterSignIn(a.next);
    } catch (err) {
      setError(authErrorMessage(err));
      setPending(null);
    }
  }

  return (
    <section
      aria-label="Demo accounts"
      className="flex flex-col gap-2.5 rounded-lg border border-dashed border-warning bg-warning-bg/50 p-4"
    >
      <b className="text-sm text-warning-ink">Local demo accounts (emulator only)</b>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="grid grid-cols-2 gap-2">
        {accounts.map((a) => (
          <button
            key={a.email}
            type="button"
            disabled={!!pending}
            onClick={() => signIn(a)}
            className="flex flex-col items-start rounded-input border border-line bg-white px-3 py-2 text-left hover:border-primary disabled:opacity-60 focus-ring"
          >
            <span className="text-sm font-semibold">{pending === a.email ? 'Signing in…' : a.label}</span>
            <span className="text-xs text-slate-500">{a.email}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
