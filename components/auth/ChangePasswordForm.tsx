'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy, Field } from '@/components/ui/Field';
import { authErrorMessage, changePassword } from '@/lib/auth/client';
import { changePasswordSchema } from '@/lib/validation/auth';
import { PasswordInput } from './PasswordInput';

type Errors = Partial<Record<'currentPassword' | 'newPassword' | 'form', string>>;

export function ChangePasswordForm({ authTenantId, email }: { authTenantId: string; email: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: String(data.get('currentPassword') ?? ''),
      newPassword: String(data.get('newPassword') ?? ''),
    });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ currentPassword: f.currentPassword?.[0], newPassword: f.newPassword?.[0] });
      return;
    }
    setErrors({});
    setDone(false);
    setPending(true);
    try {
      await changePassword(authTenantId, email, parsed.data.currentPassword, parsed.data.newPassword);
      form.reset();
      setDone(true);
      router.refresh();
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {errors.form && <Alert tone="danger">{errors.form}</Alert>}
      {done && <Alert tone="success">Password changed. Other devices have been signed out.</Alert>}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="cp-current" label="Current password" error={errors.currentPassword}>
          <PasswordInput
            id="cp-current"
            name="currentPassword"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            aria-describedby={describedBy('cp-current', { error: errors.currentPassword })}
          />
        </Field>
        <Field id="cp-new" label="New password" hint="At least 8 characters" error={errors.newPassword}>
          <PasswordInput
            id="cp-new"
            name="newPassword"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            aria-describedby={describedBy('cp-new', { hint: 1, error: errors.newPassword })}
          />
        </Field>
      </div>
      <div>
        <Button type="submit" loading={pending} loadingText="Saving">
          Change password
        </Button>
      </div>
    </form>
  );
}
