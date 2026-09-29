import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Become an organizer' };

export default function Page() {
  return (
    <div className="page-container py-14 md:py-20">
      <PhaseStub title="Become an organizer" phase={3} />
    </div>
  );
}
