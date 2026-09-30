/**
 * Stock photography shipped in /public/images (Unsplash License — free for commercial use, no attribution
 * required; sources in docs/image-credits.md). Tenant- and organizer-specific images come from uploads.
 */
export const STOCK = {
  hero: '/images/hero.webp',
  door: '/images/door.webp',
  aboutCrowd: '/images/about-crowd.webp',
  aboutCommunity: '/images/about-community.webp',
  organizerCover: '/images/organizer-cover.webp',
  /** Our own app (dashboard + scanner), captured from the seeded demo — no third-party rights. */
  productOrganizer: '/images/product-organizer.webp',
} as const;

const CITY_PHOTOS: Record<string, string> = {
  'new york': '/images/city-new-york.webp',
  brooklyn: '/images/city-new-york.webp',
  manhattan: '/images/city-new-york.webp',
  'los angeles': '/images/city-los-angeles.webp',
  chicago: '/images/city-chicago.webp',
  austin: '/images/city-austin.webp',
  miami: '/images/city-miami.webp',
  seattle: '/images/city-seattle.webp',
};

/** Skyline photo for a city tile, or null (striped placeholder) for cities we have no photo of. */
export function cityPhoto(city: string): string | null {
  return CITY_PHOTOS[city.trim().toLowerCase()] ?? null;
}
