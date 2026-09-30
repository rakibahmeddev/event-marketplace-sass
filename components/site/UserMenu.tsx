'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { logout } from '@/lib/auth/client';
import type { Role } from '@/lib/auth/roles';

export type MenuUser = { name: string; email: string | undefined; role: Role };

export function accountLinks(role: Role) {
  if (role === 'scanner') return [{ href: '/scanner', label: 'Scanner' }]; // staff accounts: scanning only
  const links = [
    { href: '/account/tickets', label: 'My tickets' },
    { href: '/account/orders', label: 'Orders' },
    { href: '/account/settings', label: 'Account settings' },
  ];
  if (role === 'organizer') links.unshift({ href: '/dashboard', label: 'Organizer dashboard' });
  if (role === 'tenant_admin') links.unshift({ href: '/admin', label: 'Admin' });
  return links;
}

export function useLogout() {
  const router = useRouter();
  return async () => {
    await logout();
    router.replace('/');
    router.refresh();
  };
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const doLogout = useLogout();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2 rounded-full pr-3 pl-1 hover:bg-mist focus-ring"
      >
        <Avatar name={user.name} tone="soft" className="size-9 text-[13px]" />
        <span className="max-w-[140px] truncate text-[15px] font-semibold">{user.name}</span>
        <Icon icon={faChevronDown} className="text-[11px] text-slate-500" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-60 overflow-hidden rounded-lg border border-line-soft bg-white py-1.5 shadow-lift"
        >
          <div className="border-b border-line-soft px-4 pt-2 pb-3">
            <b className="block truncate text-sm">{user.name}</b>
            {user.email && <span className="block truncate text-xs text-slate-500">{user.email}</span>}
          </div>
          {accountLinks(user.role).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium hover:bg-mist focus-visible:bg-mist focus-visible:outline-none"
            >
              {l.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={doLogout}
            className="block w-full border-t border-line-soft px-4 py-2.5 text-left text-sm font-medium text-danger hover:bg-mist focus-visible:bg-mist focus-visible:outline-none"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
