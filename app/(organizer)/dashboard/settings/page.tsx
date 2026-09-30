import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ProfileForm } from '@/components/organizers/ProfileForm';
import { requireOrganizer } from '@/lib/organizers/context';
import { storagePaths } from '@/lib/storage/server';

export const metadata: Metadata = { title: 'Organizer settings' };

export default async function OrganizerSettingsPage() {
  const { tenant, organizer } = await requireOrganizer();
  const host = (await headers()).get('host') ?? '';
  return (
    <ProfileForm
      authTenantId={tenant.authTenantId}
      logoFolder={storagePaths.organizerLogo(tenant.id, organizer.id)}
      profileUrl={`${host}/o/${organizer.slug}`}
      initial={{
        name: organizer.name,
        city: organizer.city,
        bio: organizer.bio,
        logo: organizer.logo ? { path: organizer.logo.path, previewUrl: organizer.logo.url } : null,
      }}
    />
  );
}
