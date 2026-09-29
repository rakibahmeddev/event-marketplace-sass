import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Overview' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Overview" phase={6} />
    </>
  );
}
