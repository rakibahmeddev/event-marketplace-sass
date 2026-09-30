'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { describedBy, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload, type UploadedImage } from '@/components/ui/ImageUpload';
import { slugify } from '@/lib/format/text';
import { applyAsOrganizer, checkOrganizerSlug } from '@/lib/organizers/actions';

type Props = {
  authTenantId: string;
  logoFolder: string;
  host: string;
  categories: { id: string; name: string }[];
  onDone: () => void;
};

/** "Become an organizer" · Step 2 — creates a pending organizer profile. */
export function ApplicationForm({ authTenantId, logoFolder, host, categories, onDone }: Props) {
  const [name, setName] = useState('');
  // The URL follows the name until the user edits it.
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slug = customSlug ?? slugify(name).slice(0, 40);
  const [checked, setChecked] = useState<{ slug: string; available: boolean; message?: string } | null>(null);
  const slugStatus = checked?.slug === slug ? checked : null;
  const [logo, setLogo] = useState<UploadedImage[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (slug.length < 3) return;
    const t = setTimeout(() => void checkOrganizerSlug(slug).then((r) => setChecked({ slug, ...r })), 350);
    return () => clearTimeout(t);
  }, [slug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setFormError(undefined);
    const res = await applyAsOrganizer({
      name,
      slug,
      category: String(data.get('category') ?? ''),
      city: String(data.get('city') ?? ''),
      bio: String(data.get('bio') ?? ''),
      logoPath: logo[0]?.path ?? null,
    });
    setPending(false);
    if (res.ok) return onDone();
    setErrors(res.fieldErrors ?? {});
    setFormError(res.error);
  }

  const err = (k: string) => errors[k];
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      <h3 className="font-display text-2xl font-extrabold">Step 2 · Your organization</h3>
      {formError && <Alert tone="danger">{formError}</Alert>}
      <Field id="org-name" label="Organization name" required error={err('name')}>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          invalid={!!err('name')}
          aria-describedby={describedBy('org-name', { error: err('name') })}
          autoComplete="organization"
        />
      </Field>
      <Field
        id="org-slug"
        label="Profile URL"
        required
        error={err('slug') ?? (slugStatus && !slugStatus.available ? slugStatus.message : undefined)}
        hint={slugStatus?.available ? '✓ Available' : undefined}
      >
        <div className="flex h-12 overflow-hidden rounded-input border-[1.5px] border-line-strong focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--brand-primary-100)]">
          <span className="flex items-center border-r-[1.5px] border-line-strong bg-mist px-3 text-[15px] whitespace-nowrap text-slate-500">
            {host}/o/
          </span>
          <input
            id="org-slug"
            value={slug}
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase())}
            aria-describedby={describedBy('org-slug', { hint: slugStatus?.available, error: err('slug') })}
            className="min-w-0 flex-1 px-3 text-[15px] outline-none"
          />
          {slugStatus?.available && (
            <span className="flex items-center pr-3 text-success">
              <Icon icon={faCheck} label="Available" />
            </span>
          )}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="org-category" label="Main category" required error={err('category')}>
          <Select
            id="org-category"
            name="category"
            defaultValue=""
            aria-invalid={!!err('category') || undefined}
          >
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="org-city" label="City" required error={err('city')}>
          <Input
            id="org-city"
            name="city"
            placeholder="e.g. Brooklyn, NY"
            invalid={!!err('city')}
            autoComplete="address-level2"
          />
        </Field>
      </div>
      <Field
        id="org-bio"
        label="Short bio"
        hint="Shown on your public profile. Up to 600 characters."
        error={err('bio')}
      >
        <Textarea id="org-bio" name="bio" maxLength={600} />
      </Field>
      <ImageUpload
        authTenantId={authTenantId}
        folder={logoFolder}
        value={logo}
        onChange={setLogo}
        label="Logo"
        hint="A square image works best. JPG, PNG or WebP, up to 5 MB."
        aspect="square"
        error={err('logoPath')}
      />
      <Button type="submit" size="lg" loading={pending} loadingText="Submitting">
        Submit application
      </Button>
    </form>
  );
}
