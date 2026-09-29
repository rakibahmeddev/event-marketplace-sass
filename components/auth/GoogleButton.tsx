'use client';

import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export function GoogleButton({
  label,
  onClick,
  loading,
}: {
  label: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <Button
      variant="secondary"
      fullWidth
      onClick={onClick}
      loading={loading}
      leadingIcon={<Icon icon={faGoogle} />}
    >
      {label}
    </Button>
  );
}

export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-slate-500">
      <span className="h-px flex-1 bg-line-soft" />
      {label}
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}
