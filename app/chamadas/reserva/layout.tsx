import type { ReactNode } from 'react';
import { privateRobots } from '@/lib/pageSeo';

export const metadata = { robots: privateRobots };

export default function PrivatePageLayout({ children }: { children: ReactNode }) {
  return children;
}
