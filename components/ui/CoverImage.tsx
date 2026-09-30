import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { ImagePlaceholder } from './ImagePlaceholder';

type Props = {
  url?: string | null;
  alt: string;
  /** Placeholder label when there is no image. */
  label: string;
  sizes: string;
  className?: string;
  /** Preload above-the-fold images (Next 16 `preload`, formerly `priority`). */
  preload?: boolean;
  labelPosition?: 'center' | 'corner';
};

/** Fills its positioned parent with an uploaded image (object-cover), or the striped placeholder. */
export function CoverImage({ url, alt, label, sizes, className, preload, labelPosition }: Props) {
  if (!url)
    return (
      <ImagePlaceholder
        label={label}
        labelPosition={labelPosition}
        className={cn('absolute inset-0', className)}
      />
    );
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      preload={preload}
      className={cn('object-cover', className)}
    />
  );
}
