import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Dashboard' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Dashboard" phase={6} />
    </>
  );
}
