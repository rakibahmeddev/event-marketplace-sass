import { Tabs } from '@/components/ui/Tabs';

/** Design 06 account tabs. */
export function AccountTabs({ active }: { active: 'tickets' | 'orders' | 'settings' }) {
  return (
    <Tabs
      label="Account"
      items={[
        { label: 'My tickets', href: '/account/tickets', active: active === 'tickets' },
        { label: 'Orders', href: '/account/orders', active: active === 'orders' },
        { label: 'Settings', href: '/account/settings', active: active === 'settings' },
      ]}
    />
  );
}
