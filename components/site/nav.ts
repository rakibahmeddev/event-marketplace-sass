/** Public site navigation. Deferred destinations are listed in docs/deferred.md and render as plain text. */
export type FooterLink = { label: string; href?: string };

/** Static columns; the Discover column is built from the tenant's categories in SiteFooter. */
export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Organizers',
    links: [
      { label: 'Create an event', href: '/become-an-organizer' },
      { label: 'Pricing & fees', href: '/become-an-organizer#pricing' },
      { label: 'QR check-in app', href: '/scanner' },
      { label: 'Payouts' },
      { label: 'Organizer dashboard', href: '/dashboard' },
      { label: 'Resources' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: '/about' },
      { label: 'Careers' },
      { label: 'Press' },
      { label: 'Contact', href: '/contact' },
      { label: 'Blog' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Help center' },
      { label: 'Find my tickets', href: '/account/tickets' },
      { label: 'Refund policy' },
      { label: 'Terms of service' },
      { label: 'Privacy policy' },
    ],
  },
];
