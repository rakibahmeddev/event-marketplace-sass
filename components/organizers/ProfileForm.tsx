'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { ImageUpload, type UploadedImage } from '@/components/ui/ImageUpload';
import { updateOrganizerProfile } from '@/lib/organizers/actions';

type Props = {
  authTenantId: string;
  logoFolder: string;
  initial: { name: string; city: string; bio: string; logo: UploadedImage | null };
  profileUrl: string;
};

export function ProfileForm({ authTenantId, logoFolder, initial, profileUrl }: Props) {
  const router = useRouter();
  const [logo, setLogo] = useState<UploadedImage[]>(initial.logo ? [initial.logo] : []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    const res = await updateOrganizerProfile({
      name: String(data.get('name') ?? ''),
      city: String(data.get('city') ?? ''),
      bio: String(data.get('bio') ?? ''),
      logoPath: logo[0]?.path ?? null,
    });
    setPending(false);
    if (res.ok) {
      setErrors({});
      setMessage({ tone: 'success', text: 'Profile saved.' });
      router.refresh();
    } else {
      setErrors(res.fieldErrors ?? {});
      setMessage({ tone: 'danger', text: res.error });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex max-w-2xl flex-col gap-5 rounded-card border border-line-soft bg-white p-5 md:p-6"
    >
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <Field id="p-name" label="Organization name" required error={errors.name}>
        <Input id="p-name" name="name" defaultValue={initial.name} invalid={!!errors.name} />
      </Field>
      <Field id="p-url" label="Profile URL" hint="Your profile URL can’t be changed after approval.">
        <Input id="p-url" value={profileUrl} disabled readOnly />
      </Field>
      <Field id="p-city" label="City" required error={errors.city}>
        <Input id="p-city" name="city" defaultValue={initial.city} invalid={!!errors.city} />
      </Field>
      <Field id="p-bio" label="Bio" hint="Up to 600 characters." error={errors.bio}>
        <Textarea id="p-bio" name="bio" defaultValue={initial.bio} maxLength={600} />
      </Field>
      <ImageUpload
        authTenantId={authTenantId}
        folder={logoFolder}
        value={logo}
        onChange={setLogo}
        label="Logo"
        aspect="square"
        error={errors.logoPath}
      />
      <div>
        <Button type="submit" loading={pending} loadingText="Saving">
          Save profile
        </Button>
      </div>
    </form>
  );
}
