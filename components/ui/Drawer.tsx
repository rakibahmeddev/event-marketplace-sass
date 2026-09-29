'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils/cn';
import { Icon } from './Icon';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: 'left' | 'right' | 'bottom';
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Off-canvas panel (mobile menu, filter drawer). Built on <dialog> so focus
 * trapping, Escape-to-close and the inert background come from the browser.
 */
export function Drawer({ open, onClose, title, side = 'right', footer, children }: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'm-0 max-h-none max-w-none bg-white p-0 text-ink backdrop:bg-ink/50',
        side === 'bottom'
          ? 'top-auto bottom-0 h-auto max-h-[90dvh] w-full rounded-t-sheet'
          : 'top-0 h-dvh w-[min(360px,88vw)]',
        side === 'right' && 'right-0 left-auto',
        side === 'left' && 'left-0',
      )}
    >
      <div className="flex h-full max-h-[inherit] flex-col">
        <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-line-soft pr-2 pl-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full hover:bg-mist focus-ring"
          >
            <Icon icon={faXmark} className="text-lg" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line-soft p-4">{footer}</div>}
      </div>
    </dialog>
  );
}
