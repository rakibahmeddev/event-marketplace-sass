import type { Metadata } from 'next';
import { PhaseStub } from '@/components/site/PhaseStub';

export const metadata: Metadata = { title: 'Settings' };

export default function Page() {
  return (
    <>
      <PhaseStub title="Settings" phase={6} />
    </>
  );
}
