import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Scan' };

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
