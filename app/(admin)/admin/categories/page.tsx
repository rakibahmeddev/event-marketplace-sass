import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Categories' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Categories" phase={3} />
    </>
  );
}
