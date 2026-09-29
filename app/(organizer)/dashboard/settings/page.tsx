import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Organizer settings' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Organizer settings" phase={3} />
    </>
  );
}
