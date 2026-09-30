import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Scan', robots: { index: false } };

export default function ScannerLayout({ children }: { children: ReactNode }) {
  return children;
}
