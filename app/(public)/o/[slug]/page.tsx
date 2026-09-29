import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Organizer' };

export default function Page() {
  return (
    <div className="page-container py-14 md:py-20">
      <PhaseStub title="Organizer" phase={3} />
    </div>
  );
}
