import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Create event' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Create event" phase={3} />
    </>
  );
}
