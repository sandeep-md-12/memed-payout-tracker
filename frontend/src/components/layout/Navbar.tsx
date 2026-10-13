'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '@/components/common/ui';
import { useAuth } from '@/context/AuthContext';
import { homeFor } from '@/utils/format';

const LINKS = {
  brand: [{ href: '/brand', label: 'My campaigns' }],
  creator: [
    { href: '/creator', label: 'Live campaigns' },
    { href: '/creator/submissions', label: 'My posts & earnings' },
  ],
} as const;

export function Navbar() {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href={user ? homeFor(user.role) : '/'} className="text-lg font-bold tracking-tight text-indigo-600">
          Meme&apos;d <span className="font-medium text-slate-500">Payouts</span>
        </Link>

        {user &&
          LINKS[user.role].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm ${pathname === link.href ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {link.label}
            </Link>
          ))}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {ready && user && (
            <>
              <span className="text-slate-700">{user.name}</span>
              <Badge tone={user.role === 'brand' ? 'blue' : 'green'}>{user.role}</Badge>
              <button onClick={logout} className="text-slate-500 hover:text-slate-900">
                Log out
              </button>
            </>
          )}
          {ready && !user && (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/signup" className="rounded-md bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
