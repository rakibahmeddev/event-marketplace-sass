import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Orders' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Orders" phase={4} />
    </>
  );
}
