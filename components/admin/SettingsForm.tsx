'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { faFire } from '@fortawesome/free-solid-svg-icons';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ImageUpload, type UploadedImage } from '@/components/ui/ImageUpload';
import { Logo } from '@/components/ui/Logo';
import { brandingToCssVars } from '@/lib/tenant/branding';
import { brandContrastProblems } from '@/lib/format/contrast';
import { updateTenantSettings } from '@/lib/tenant/actions';
import { SOCIAL_NETWORKS, type SocialNetwork } from '@/lib/tenant/settings';

export type SettingsValues = {
  name: string;
  primaryColor: string;
  accentColor: string;
  logo: UploadedImage | null;
  supportEmail: string;
  footerTagline: string;
  socialLinks: Record<SocialNetwork, string>;
  commissionPercent: string;
};

const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-5 md:p-6">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {description && <p className="text-sm text-slate-600">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field id={id} label={label} error={error}>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={HEX.test(value) ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-12 w-14 shrink-0 cursor-pointer rounded-input border-[1.5px] border-line-strong bg-white p-1"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          invalid={!!error}
          maxLength={7}
          className="font-mono uppercase"
        />
      </div>
    </Field>
  );
}

/** Admin → Settings: brand, contact & footer, commission — with a live preview. */
export function SettingsForm({
  initial,
  authTenantId,
  logoFolder,
  currency,
  timezone,
}: {
  initial: SettingsValues;
  authTenantId: string;
  logoFolder: string;
  currency: string;
  timezone: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const set = <K extends keyof SettingsValues>(k: K, value: SettingsValues[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  const colorsValid = HEX.test(v.primaryColor) && HEX.test(v.accentColor);
  const liveContrast = colorsValid ? brandContrastProblems(v.primaryColor, v.accentColor) : {};
  const previewVars = useMemo(
    () =>
      (colorsValid
        ? brandingToCssVars({
            name: v.name || 'Preview',
            primaryColor: v.primaryColor,
            accentColor: v.accentColor,
          })
        : {}) as CSSProperties,
    [colorsValid, v.name, v.primaryColor, v.accentColor],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const res = await updateTenantSettings({
      name: v.name,
      primaryColor: v.primaryColor,
      accentColor: v.accentColor,
      logoPath: v.logo?.path ?? null,
      supportEmail: v.supportEmail,
      footerTagline: v.footerTagline,
      socialLinks: v.socialLinks,
      commissionPercent: Number(v.commissionPercent),
    });
    setPending(false);
    if (res.ok) {
      setErrors({});
      setMessage({ tone: 'success', text: 'Settings saved. The marketplace is updated.' });
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
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Section title="Brand" description="Shown in the header, footer, dashboards and tickets.">
          <Field id="s-name" label="Marketplace name" required error={errors.name}>
            <Input
              id="s-name"
              value={v.name}
              onChange={(e) => set('name', e.target.value)}
              invalid={!!errors.name}
              maxLength={60}
            />
          </Field>
          <ImageUpload
            authTenantId={authTenantId}
            folder={logoFolder}
            value={v.logo ? [v.logo] : []}
            onChange={(imgs) => set('logo', imgs[0] ?? null)}
            label="Logo"
            hint="A wide logo on a transparent background works best (PNG or WebP, up to 5 MB). Leave empty to use the default mark."
            error={errors.logoPath}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="s-primary"
              label="Primary colour"
              value={v.primaryColor}
              onChange={(c) => set('primaryColor', c)}
              error={errors.primaryColor ?? liveContrast.primaryColor}
            />
            <ColorField
              id="s-accent"
              label="Accent colour"
              value={v.accentColor}
              onChange={(c) => set('accentColor', c)}
              error={errors.accentColor ?? liveContrast.accentColor}
            />
          </div>
          <p className="text-xs text-slate-500">
            Primary is used for buttons and links (white text). Accent is for “Selling fast” badges and
            organizer buttons (dark text). Both must be readable (WCAG AA 4.5:1).
          </p>
        </Section>

        <Section title="Contact & footer">
          <Field
            id="s-email"
            label="Support email"
            hint="Shown on the Contact page and used by the contact form."
            error={errors.supportEmail}
          >
            <Input
              id="s-email"
              type="email"
              value={v.supportEmail}
              onChange={(e) => set('supportEmail', e.target.value)}
              invalid={!!errors.supportEmail}
            />
          </Field>
          <Field
            id="s-tagline"
            label="Footer tagline"
            hint="Up to 200 characters."
            error={errors.footerTagline}
          >
            <Textarea
              id="s-tagline"
              rows={2}
              value={v.footerTagline}
              onChange={(e) => set('footerTagline', e.target.value)}
              maxLength={200}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map((n) => (
              <Field key={n} id={`s-social-${n}`} label={SOCIAL_LABELS[n]} error={errors[`socialLinks.${n}`]}>
                <Input
                  id={`s-social-${n}`}
                  type="url"
                  placeholder="https://"
                  value={v.socialLinks[n]}
                  onChange={(e) => set('socialLinks', { ...v.socialLinks, [n]: e.target.value })}
                  invalid={!!errors[`socialLinks.${n}`]}
                />
              </Field>
            ))}
          </div>
        </Section>

        <Section title="Fees & region">
          <Field
            id="s-commission"
            label="Commission per paid ticket (%)"
            hint="Shown on the organizer pricing page and applied at checkout."
            error={errors.commissionPercent}
          >
            <Input
              id="s-commission"
              inputMode="decimal"
              value={v.commissionPercent}
              onChange={(e) => set('commissionPercent', e.target.value)}
              invalid={!!errors.commissionPercent}
              className="max-w-[160px]"
            />
          </Field>
          <dl className="grid gap-1 text-sm sm:grid-cols-[140px_1fr]">
            <dt className="text-slate-500">Currency</dt>
            <dd>{currency}</dd>
            <dt className="text-slate-500">Timezone</dt>
            <dd>{timezone.replace(/_/g, ' ')}</dd>
          </dl>
          <p className="text-xs text-slate-500">
            Currency and timezone can’t be changed here: existing prices and event times depend on them.
          </p>
        </Section>
      </div>

      <div className="flex flex-col gap-5 xl:sticky xl:top-6">
        <section
          style={previewVars}
          className="flex flex-col gap-4 overflow-hidden rounded-card border border-line-soft bg-white"
        >
          <h2 className="px-5 pt-5 font-display text-base font-bold">Preview</h2>
          <div className="flex items-center justify-between border-y border-line-soft px-5 py-3">
            <Logo name={v.name || 'Marketplace'} href="#" logoUrl={v.logo?.previewUrl ?? null} size="sm" />
            <span className="flex h-9 items-center rounded-input bg-primary px-4 text-sm font-semibold text-white">
              Sign up
            </span>
          </div>
          <div className="flex flex-col gap-3 px-5 pb-5">
            <span className="text-xs font-semibold tracking-[0.06em] text-primary uppercase">
              Music concerts
            </span>
            <b className="font-display text-lg leading-6">Sunset Rooftop Jazz</b>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent" icon={<Icon icon={faFire} />}>
                Selling fast
              </Badge>
              <Badge tone="info">Online</Badge>
            </div>
            <div className="flex gap-2">
              <span className="flex h-10 flex-1 items-center justify-center rounded-input bg-primary text-sm font-semibold text-white">
                Get tickets
              </span>
              <span className="flex h-10 flex-1 items-center justify-center rounded-input bg-accent text-sm font-bold text-ink">
                Create event
              </span>
            </div>
          </div>
        </section>
        <div className="flex flex-col gap-3 rounded-card border border-line-soft bg-white p-5">
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <Button type="submit" loading={pending} loadingText="Saving" disabled={pending}>
            Save settings
          </Button>
          <p className="text-xs text-slate-500">Changes are recorded in the audit log.</p>
        </div>
      </div>
    </form>
  );
}
