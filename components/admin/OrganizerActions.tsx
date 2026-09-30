'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { callFunction } from '@/lib/firebase/callables';

export function OrganizerActions({
  authTenantId,
  organizerId,
  name,
  status,
}: {
  authTenantId: string;
  organizerId: string;
  name: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<'approve' | 'suspend' | null>(null);
  const [error, setError] = useState<string>();

  async function run(kind: 'approve' | 'suspend') {
    if (
      kind === 'suspend' &&
      !window.confirm(
        `Suspend ${name}? Their published events will be unpublished and they lose organizer access.`,
      )
    )
      return;
    setPending(kind);
    setError(undefined);
    const res = await callFunction(
      authTenantId,
      kind === 'approve' ? 'approveOrganizer' : 'suspendOrganizer',
      { organizerId },
    );
    setPending(null);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status !== 'approved' && (
          <Button
            size="sm"
            onClick={() => run('approve')}
            loading={pending === 'approve'}
            disabled={!!pending}
          >
            {status === 'suspended' ? 'Reinstate' : 'Approve'}
          </Button>
        )}
        {status !== 'suspended' && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => run('suspend')}
            loading={pending === 'suspend'}
            disabled={!!pending}
          >
            {status === 'pending' ? 'Reject' : 'Suspend'}
          </Button>
        )}
      </div>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
