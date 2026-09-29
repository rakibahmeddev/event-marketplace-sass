'use client';

import { useState } from 'react';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { DashboardNav } from './DashboardNav';
import type { DashboardNavItem } from './types';

export function DashboardMobileBar({
  title,
  accountName,
  items,
}: {
  title: string;
  accountName: string;
  items: DashboardNavItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-20 flex h-[60px] items-center gap-2.5 bg-ink pr-2 pl-4 text-white lg:hidden">
      <Avatar name={accountName} tone="white" className="size-[30px] rounded-[9px] text-[11px]" />
      <b className="flex-1 font-display text-base font-bold">{title}</b>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-full hover:bg-ink-800"
      >
        <Icon icon={faBars} />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={title} side="left">
        <div className="-m-4 min-h-full bg-ink p-3.5 text-ink-muted">
          <DashboardNav items={items} onNavigate={() => setOpen(false)} />
        </div>
      </Drawer>
    </div>
  );
}
