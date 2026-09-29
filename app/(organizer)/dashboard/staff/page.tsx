import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Check-in staff' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Check-in staff" phase={5} />
    </>
  );
}
