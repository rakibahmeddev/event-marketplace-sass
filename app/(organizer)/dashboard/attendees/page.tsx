import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Attendees' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Attendees" phase={5} />
    </>
  );
}
