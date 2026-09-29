import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = {};

export default function Page() {
  return (
    <div className="page-container py-14 md:py-20">
      <PhaseStub title="Home" phase={3} />
    </div>
  );
}
