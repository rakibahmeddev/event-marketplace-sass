import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Sales reports' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Sales reports" phase={6} />
    </>
  );
}
