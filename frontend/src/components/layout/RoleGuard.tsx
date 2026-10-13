'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { LoadingState } from '@/components/common/ui';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/services/types';
import { homeFor } from '@/utils/format';

/** Shows its pages only to a logged-in user with the right role; sends everyone else away. */
export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [ready, user, role, router]);

  if (!ready || !user || user.role !== role) return <LoadingState />;
  return <>{children}</>;
}
