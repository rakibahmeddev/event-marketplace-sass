import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { brandingToCssVars } from '@/lib/tenant/branding';
import { getCurrentTenantBranding } from '@/lib/tenant/current';
import './globals.css';

// Self-hosted at build time by next/font — no runtime request to Google.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getCurrentTenantBranding();
  return {
    title: { default: branding.name, template: `%s · ${branding.name}` },
    description: 'Discover concerts, workshops, sports and nights out — tickets delivered as QR codes.',
  };
}

export const viewport: Viewport = { themeColor: '#ffffff' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const branding = await getCurrentTenantBranding();
  // Tenant brand colours override the defaults in globals.css (validated hex only).
  const themeVars = brandingToCssVars(branding) as CSSProperties;
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} style={themeVars}>
      <body>{children}</body>
    </html>
  );
}
