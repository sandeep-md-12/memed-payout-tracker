import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role="creator">{children}</RoleGuard>;
}
