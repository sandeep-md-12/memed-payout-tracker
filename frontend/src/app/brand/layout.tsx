import type { ReactNode } from 'react';
import { RoleGuard } from '@/components/layout/RoleGuard';

export default function BrandLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role="brand">{children}</RoleGuard>;
}
