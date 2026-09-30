/** Test-only password for every account created by scripts/seed-emulators.ts (emulator data, never a real credential). */
export const SEED_PASSWORD = 'seed-Password-123';

export const SEED_USERS = {
  admin: 'admin@demo.test',
  organizer: 'organizer@demo.test',
  scanner: 'scanner@demo.test',
  attendee: 'attendee@demo.test',
  applicant: 'applicant@demo.test',
  /** Used only by the purchase E2E flow (logouts elsewhere revoke every session of an account). */
  buyer: 'buyer@demo.test',
  otherAdmin: 'admin@other.test',
  otherAttendee: 'attendee@other.test',
} as const;
