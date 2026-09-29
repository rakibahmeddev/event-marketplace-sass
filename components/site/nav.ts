/** Public site navigation. Deferred destinations are listed in docs/deferred.md and render as plain text. */
export type FooterLink = { label: string; href?: string };

export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Discover',
    links: [
      { label: 'Music Concerts', href: '/events?category=music-concerts' },
      { label: 'Sports Events', href: '/events?category=sports-events' },
      { label: 'Workshops', href: '/events?category=workshops' },
      { label: 'Festivals', href: '/events?category=festivals' },
      { label: 'Conferences', href: '/events?category=conferences' },
      { label: 'Nightlife', href: '/events?category=nightlife' },
      { label: 'Comedy', href: '/events?category=comedy' },
      { label: 'Arts & Culture', href: '/events?category=arts-culture' },
    ],
  },
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
