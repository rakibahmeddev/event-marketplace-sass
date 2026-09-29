import Link from 'next/link';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

export type OrganizerCardData = {
  href: string;
  name: string;
  category: string;
  verified?: boolean;
  upcomingLabel: string;
};

/** Following organizers is deferred (docs/deferred.md), so the design's Follow button and follower count are left out. */
export function OrganizerCard({ organizer }: { organizer: OrganizerCardData }) {
  return (
    <Link
      href={organizer.href}
      className="flex flex-col items-center gap-3.5 rounded-card border border-line-soft px-6 py-7 text-center transition-shadow hover:shadow-[0_12px_32px_rgb(26_26_46/0.1)] focus-ring"
    >
      <Avatar name={organizer.name} size="xl" ring />
      <div className="flex flex-col gap-1">
        <span className="flex items-center justify-center gap-1.5 font-display text-lg leading-6 font-bold">
          {organizer.name}
          {organizer.verified && (
            <Icon icon={faCircleCheck} label="Verified" className="text-sm text-primary" />
          )}
        </span>
        <span className="text-sm text-slate-500">{organizer.category}</span>
      </div>
      <span className="text-[13px] text-slate-600">{organizer.upcomingLabel}</span>
    </Link>
  );
}
