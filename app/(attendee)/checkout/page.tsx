import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Checkout' };

export default function Page() {
  return (
    <div className="page-container py-8">
      <PhaseStub title="Checkout" phase={4} />
    </div>
  );
}
