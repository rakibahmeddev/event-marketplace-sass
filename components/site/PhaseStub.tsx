import type { ReactNode } from 'react';
import { faHammer } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';

/** Temporary page body for routes whose feature lands in a later phase. */
export function PhaseStub({
  title,
  phase,
  children,
}: {
  title: string;
  phase: number;
  children?: ReactNode;
}) {
  return (
    <EmptyState
      icon={<Icon icon={faHammer} />}
      title={title}
      description={children ?? `This page is built in Phase ${phase}.`}
    />
  );
}
