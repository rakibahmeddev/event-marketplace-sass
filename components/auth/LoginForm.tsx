'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Choice';
import { describedBy, Field, Input } from '@/components/ui/Field';
import { authErrorMessage, loginWithEmail, loginWithGoogle } from '@/lib/auth/client';
import { loginFormSchema } from '@/lib/validation/auth';
import { GoogleButton, OrDivider } from './GoogleButton';
import { PasswordInput } from './PasswordInput';
import { useAfterSignIn } from './useAuthNavigation';

type Errors = Partial<Record<'email' | 'password' | 'form', string>>;

/** `staff`: the scanner's staff login (design 10) — email/password only, no organizer sign-up link. */
export function LoginForm({
  authTenantId,
  redirectTo,
  staff = false,
}: {
  authTenantId: string;
  redirectTo?: string;
  staff?: boolean;
}) {
  const afterSignIn = useAfterSignIn(redirectTo);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<'email' | 'google' | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = loginFormSchema.safeParse({
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
      remember: staff || data.get('remember') === 'on',
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setPending('email');
    try {
      await loginWithEmail(authTenantId, parsed.data.email, parsed.data.password, parsed.data.remember);
      afterSignIn();
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
      setPending(null);
    }
  }

  async function onGoogle() {
    setErrors({});
    setPending('google');
    try {
      await loginWithGoogle(authTenantId);
      afterSignIn();
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
      setPending(null);
    }
  }

  return (
    <>
      {!staff && (
        <>
          <GoogleButton label="Continue with Google" onClick={onGoogle} loading={pending === 'google'} />
          <OrDivider label="or with email" />
        </>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        {errors.form && <Alert tone="danger">{errors.form}</Alert>}
        <Field id="login-email" label={staff ? 'Staff email' : 'Email'} error={errors.email}>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            invalid={!!errors.email}
            aria-describedby={describedBy('login-email', { error: errors.email })}
          />
        </Field>
        <Field
          id="login-password"
          label="Password"
          error={errors.password}
          labelAction={
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Forgot?
            </Link>
          }
        >
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            invalid={!!errors.password}
            aria-describedby={describedBy('login-password', { error: errors.password })}
          />
        </Field>
        {!staff && <Checkbox name="remember" label="Keep me logged in" defaultChecked className="text-sm" />}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending === 'email'}
          loadingText="Logging in"
          disabled={!!pending}
        >
          Log in
        </Button>
      </form>
      {!staff && (
        <p className="text-center text-sm text-slate-600">
          Organizing events?{' '}
          <Link href="/become-an-organizer" className="font-semibold text-primary hover:text-primary-hover">
            Create an organizer account
          </Link>
        </p>
      )}
    </>
  );
}
