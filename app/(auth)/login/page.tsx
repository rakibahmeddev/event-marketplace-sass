import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Log in' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Log in" phase={2} />
    </>
  );
}
