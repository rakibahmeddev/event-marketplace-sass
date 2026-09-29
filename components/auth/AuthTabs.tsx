import { SegmentedTabs } from '@/components/ui/Tabs';

export function AuthTabs({ active, next }: { active: 'login' | 'register'; next?: string }) {
  const q = next ? `?next=${encodeURIComponent(next)}` : '';
  return (
    <SegmentedTabs
      label="Account"
      items={[
        { label: 'Log in', href: `/login${q}`, active: active === 'login' },
        { label: 'Sign up', href: `/register${q}`, active: active === 'register' },
      ]}
    />
  );
}
