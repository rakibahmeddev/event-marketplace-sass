import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import {
  faCirclePlus,
  faGaugeHigh,
  faGear,
  faQrcode,
  faReceipt,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import type { DashboardNavItem } from '@/components/dashboard/types';

// Payouts and Reports from the design are deferred (docs/deferred.md).
export const organizerNav: DashboardNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: faGaugeHigh, exact: true },
  { href: '/dashboard/events', label: 'Events', icon: faCalendar, exact: true },
  { href: '/dashboard/events/new', label: 'Create Event', icon: faCirclePlus },
  { href: '/dashboard/orders', label: 'Orders', icon: faReceipt },
  { href: '/dashboard/attendees', label: 'Attendees', icon: faUsers },
  { href: '/dashboard/staff', label: 'Check-in Staff', icon: faQrcode },
  { href: '/dashboard/settings', label: 'Settings', icon: faGear },
];
