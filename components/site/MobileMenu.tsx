'use client';

import Link from 'next/link';
import { useState } from 'react';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { accountLinks, useLogout, type MenuUser } from './UserMenu';

const siteLinks = [
  { href: '/events', label: 'Browse events' },
  { href: '/become-an-organizer', label: 'Create an event' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function MobileMenu({ user }: { user: MenuUser | null }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const doLogout = useLogout();
  const links = user ? [...accountLinks(user.role), ...siteLinks] : siteLinks;
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-full hover:bg-mist focus-ring"
      >
        <Icon icon={faBars} className="text-[19px]" />
      </button>
      <Drawer
        open={open}
        onClose={close}
        title="Menu"
        footer={
          user ? (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                close();
                void doLogout();
              }}
            >
              Log out
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <ButtonLink href="/login" variant="secondary" onClick={close}>
                Log in
              </ButtonLink>
              <ButtonLink href="/register" onClick={close}>
                Sign up
              </ButtonLink>
            </div>
          )
        }
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className="flex h-[52px] items-center border-b border-line-soft text-[15px] font-semibold"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
