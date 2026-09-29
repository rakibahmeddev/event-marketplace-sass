import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Events' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Events" phase={3} />
    </>
  );
}
