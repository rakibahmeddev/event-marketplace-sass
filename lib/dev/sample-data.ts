import {
  faCampground,
  faFaceLaughBeam,
  faFutbol,
  faMartiniGlassCitrus,
  faMicrophoneLines,
  faMusic,
  faPalette,
  faScrewdriverWrench,
} from '@fortawesome/free-solid-svg-icons';
import type { EventCardData } from '@/components/events/EventCard';
import type { OrganizerCardData } from '@/components/organizers/OrganizerCard';
import type { TicketCardData } from '@/components/tickets/TicketCard';

// Sample content from design/data.js — used only by /dev/style-guide.

export const sampleCategories = [
  { name: 'Music Concerts', icon: faMusic },
  { name: 'Sports Events', icon: faFutbol },
  { name: 'Workshops', icon: faScrewdriverWrench },
  { name: 'Festivals', icon: faCampground },
  { name: 'Conferences', icon: faMicrophoneLines },
  { name: 'Nightlife', icon: faMartiniGlassCitrus },
  { name: 'Comedy', icon: faFaceLaughBeam },
  { name: 'Arts & Culture', icon: faPalette },
];

export const sampleEvents: EventCardData[] = [
  {
    href: '/events/neon-tides-live',
    title: 'Neon Tides Live — Summer Tour Finale',
    category: 'Music Concerts',
    month: 'OCT',
    day: '03',
    when: 'Sat, Oct 3 · 8:00 PM',
    venue: 'Harbor Hall, Brooklyn',
    priceLabel: 'From $45',
    organizerName: 'Pulse Live',
    status: 'selling-fast',
    imageLabel: 'concert crowd',
  },
  {
    href: '/events/midnight-warehouse',
    title: 'Midnight Warehouse: Techno All-Nighter',
    category: 'Nightlife',
    month: 'OCT',
    day: '03',
    when: 'Sat, Oct 3 · 11:00 PM',
    venue: 'Dock 9, Brooklyn',
    priceLabel: 'From $25',
    organizerName: 'Dock 9 Nights',
    status: 'sold-out',
    imageLabel: 'club lights',
  },
  {
    href: '/events/open-studios',
    title: 'Open Studios: Contemporary Print Fair',
    category: 'Arts & Culture',
    month: 'OCT',
    day: '04',
    when: 'Sun, Oct 4 · 11:00 AM',
    venue: 'Mill Street Gallery, Seattle',
    priceLabel: 'Free',
    organizerName: 'Mill Street Arts',
    imageLabel: 'gallery',
  },
  {
    href: '/events/harbourlight-2026',
    title: 'Harbourlight Music Festival 2026',
    category: 'Festivals',
    month: 'OCT',
    day: '17',
    when: 'Oct 17–18 · 12:00 PM',
    venue: 'Bayfront Park, Miami',
    priceLabel: 'From $89',
    organizerName: 'Harbourlight',
    imageLabel: 'festival stage',
  },
];

export const sampleOrganizers: OrganizerCardData[] = [
  {
    href: '/o/pulse-live',
    name: 'Pulse Live',
    category: 'Concert promoter',
    verified: true,
    upcomingLabel: '32 upcoming',
  },
  {
    href: '/o/clay-collective',
    name: 'Clay Collective',
    category: 'Craft workshops',
    verified: true,
    upcomingLabel: '14 upcoming',
  },
];

export const sampleTicket: TicketCardData = {
  tenantName: 'brandname',
  eventTitle: 'Neon Tides Live — Summer Tour Finale',
  date: 'Sat, Oct 3, 2026',
  time: '8:00 PM · Doors 7',
  attendeeName: 'Jordan Lee',
  ticketTypeName: 'General Admission',
  venue: 'Harbor Hall · 210 Kent Ave, Brooklyn',
  ticketCode: 'TX-2026-004821',
  footnote: 'Ticket 1 of 2 · Order #10482',
};
