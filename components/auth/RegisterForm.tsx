'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy, Field, Input } from '@/components/ui/Field';
import { authErrorMessage, loginWithGoogle, registerWithEmail } from '@/lib/auth/client';
import { registerFormSchema } from '@/lib/validation/auth';
import { GoogleButton, OrDivider } from './GoogleButton';
import { PasswordInput } from './PasswordInput';
import { useAfterSignIn } from './useAuthNavigation';

type FieldName = 'firstName' | 'lastName' | 'email' | 'password';
type Errors = Partial<Record<FieldName | 'form', string>>;

export function RegisterForm({ authTenantId, redirectTo }: { authTenantId: string; redirectTo?: string }) {
  const afterSignIn = useAfterSignIn(redirectTo);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<'email' | 'google' | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = registerFormSchema.safeParse({
      firstName: String(data.get('firstName') ?? ''),
      lastName: String(data.get('lastName') ?? ''),
      email: String(data.get('email') ?? ''),
      password: String(data.get('password') ?? ''),
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({
        firstName: f.firstName?.[0],
        lastName: f.lastName?.[0],
        email: f.email?.[0],
        password: f.password?.[0],
      });
      return;
    }
    setErrors({});
    setPending('email');
    try {
      await registerWithEmail(authTenantId, parsed.data);
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

  const input = (id: FieldName, label: string, props: Record<string, string>) => (
    <Field id={`reg-${id}`} label={label} error={errors[id]}>
      {id === 'password' ? (
        <PasswordInput
          id={`reg-${id}`}
          name={id}
          invalid={!!errors[id]}
          aria-describedby={describedBy(`reg-${id}`, { error: errors[id] })}
          {...props}
        />
      ) : (
        <Input
          id={`reg-${id}`}
          name={id}
          invalid={!!errors[id]}
          aria-describedby={describedBy(`reg-${id}`, { error: errors[id] })}
          {...props}
        />
      )}
    </Field>
  );

  return (
    <>
      <GoogleButton label="Continue with Google" onClick={onGoogle} loading={pending === 'google'} />
      <OrDivider />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
        {errors.form && <Alert tone="danger">{errors.form}</Alert>}
        <div className="grid grid-cols-2 gap-2.5">
          {input('firstName', 'First name', { autoComplete: 'given-name' })}
          {input('lastName', 'Last name', { autoComplete: 'family-name' })}
        </div>
        {input('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {input('password', 'Password (8+ characters)', { autoComplete: 'new-password' })}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={pending === 'email'}
          loadingText="Creating account"
          disabled={!!pending}
        >
          Create account
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-hover">
          Log in
        </Link>
      </p>
    </>
  );
}
