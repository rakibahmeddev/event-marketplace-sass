import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Create your account' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Create your account" phase={2} />
    </>
  );
}
