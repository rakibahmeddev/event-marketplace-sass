import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Mobile-first frame for the staff scanner (design 10). Full-bleed on phones,
 * centred phone-width column on larger screens. `tone="camera"` is the dark
 * camera view; `light` is login / event selection.
 */
export function ScannerShell({
  tone = 'light',
  children,
}: {
  tone?: 'light' | 'mist' | 'camera';
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink-800 md:py-6">
      <div
        className={cn(
          'relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden md:min-h-[812px] md:rounded-[28px]',
          tone === 'light' && 'bg-white',
          tone === 'mist' && 'bg-mist',
          tone === 'camera' && 'bg-[#0E0E1A] text-white',
        )}
      >
        {children}
      </div>
    </div>
  );
}
