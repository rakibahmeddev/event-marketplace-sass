import { faChartColumn, faGaugeHigh, faGear, faStore, faTags } from '@fortawesome/free-solid-svg-icons';
import type { DashboardNavItem } from '@/components/dashboard/types';

// No admin design was provided; this reuses the organizer dashboard shell.
export const adminNav: DashboardNavItem[] = [
  { href: '/admin', label: 'Overview', icon: faGaugeHigh, exact: true },
  { href: '/admin/organizers', label: 'Organizers', icon: faStore },
  { href: '/admin/categories', label: 'Categories', icon: faTags },
  { href: '/admin/reports', label: 'Sales reports', icon: faChartColumn },
  { href: '/admin/settings', label: 'Settings', icon: faGear },
];
