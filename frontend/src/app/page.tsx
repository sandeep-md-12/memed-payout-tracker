'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingState } from '@/components/common/ui';
import { useAuth } from '@/context/AuthContext';
import { homeFor } from '@/utils/format';

/** Sends visitors to their dashboard, or to login. */
export default function HomePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready) router.replace(user ? homeFor(user.role) : '/login');
  }, [ready, user, router]);

  return <LoadingState />;
}
