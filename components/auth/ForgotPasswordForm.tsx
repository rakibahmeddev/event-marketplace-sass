'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy, Field, Input } from '@/components/ui/Field';
import { authErrorMessage, requestPasswordReset } from '@/lib/auth/client';
import { forgotPasswordSchema } from '@/lib/validation/auth';

export function ForgotPasswordForm({ authTenantId }: { authTenantId: string }) {
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({
      email: String(new FormData(e.currentTarget).get('email') ?? ''),
    });
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0]);
      return;
    }
    setError(undefined);
    setFormError(undefined);
    setPending(true);
    try {
      await requestPasswordReset(authTenantId, parsed.data.email);
      setSent(true);
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <>
        <Alert tone="success">
          If an account exists for that email, a reset link is on its way. Check your inbox.
        </Alert>
        <Link
          href="/login"
          className="text-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          Back to log in
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Field id="reset-email" label="Email" error={error}>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          invalid={!!error}
          aria-describedby={describedBy('reset-email', { error })}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending">
        Send reset link
      </Button>
      <Link href="/login" className="text-center text-sm font-semibold text-primary hover:text-primary-hover">
        Back to log in
      </Link>
    </form>
  );
}
