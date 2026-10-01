import Link from 'next/link';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';

/** Shown on public pages opened with ?preview=1 by a marketplace admin. */
export function PreviewBanner({ editHref }: { editHref: string }) {
  return (
    <div role="status" className="sticky top-0 z-40 bg-warning-bg text-warning-ink">
      <div className="page-container flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <Icon icon={faEye} />
          Preview — unpublished changes. Visitors still see the published page.
        </span>
        <Link href={editHref} className="font-semibold underline underline-offset-2">
          Back to the editor
        </Link>
      </div>
    </div>
  );
}
