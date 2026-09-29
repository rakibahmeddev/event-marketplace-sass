import Link from 'next/link';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Icon } from '@/components/ui/Icon';

export function CategoryTile({ name, icon, href }: { name: string; icon: IconDefinition; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 rounded-card px-2 py-5 text-center transition-colors hover:bg-mist focus-ring"
    >
      <span className="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary md:size-[72px] md:text-[26px]">
        <Icon icon={icon} />
      </span>
      <span className="font-display text-sm leading-[18px] font-bold">{name}</span>
    </Link>
  );
}
