import type { ComponentProps } from 'react';
import { Logo } from '@/components/ui/Logo';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

/** The current marketplace's logo (uploaded image or default mark), for server components. */
export async function TenantLogo(
  props: Omit<ComponentProps<typeof Logo>, 'name' | 'logoUrl'> & { name?: string },
) {
  const branding = await getCurrentTenantBranding();
  return <Logo {...props} name={props.name ?? branding.name} logoUrl={branding.logo?.url ?? null} />;
}
