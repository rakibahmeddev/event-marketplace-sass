'use client';

import { useState, type ReactNode } from 'react';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';

/** Mobile "Filters" button + off-canvas drawer (design 03 · filter drawer). */
export function MobileFilters({
  activeCount,
  resultLabel,
  children,
}: {
  activeCount: number;
  resultLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-line-strong px-4 text-sm font-semibold focus-ring lg:hidden"
      >
        <Icon icon={faSliders} />
        Filters
        {activeCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] text-white">
            {activeCount}
          </span>
        )}
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        side="bottom"
        footer={
          <div className="grid grid-cols-[auto_1fr] gap-2.5">
            <ButtonLink href="/events" variant="secondary" onClick={() => setOpen(false)}>
              Reset
            </ButtonLink>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-12 rounded-input bg-primary px-6 text-[15px] font-semibold text-white hover:bg-primary-hover focus-ring"
            >
              {resultLabel}
            </button>
          </div>
        }
      >
        <div className="-mx-4 -my-4">{children}</div>
      </Drawer>
    </>
  );
}
