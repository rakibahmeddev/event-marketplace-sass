import Link from 'next/link';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

export function CityTile({ name, count, href }: { name: string; count: string; href: string }) {
  return (
    <Link
      href={href}
      className="group relative flex h-[200px] items-end overflow-hidden rounded-card focus-ring"
    >
      <ImagePlaceholder
        label="skyline photo"
        className="absolute inset-0 [&>span]:inset-auto [&>span]:top-3.5 [&>span]:right-4"
      />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgb(26_26_46/0.85),rgb(26_26_46/0)_60%)]" />
      <div className="relative flex w-full items-end justify-between px-6 py-5">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-2xl leading-8 font-extrabold text-white">{name}</span>
          <span className="text-sm text-[#D9D6E8]">{count}</span>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-white text-ink transition-transform group-hover:translate-x-0.5">
          <Icon icon={faArrowRight} />
        </span>
      </div>
    </Link>
  );
}
