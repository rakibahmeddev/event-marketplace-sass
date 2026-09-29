import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Organizers' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Organizers" phase={3} />
    </>
  );
}
