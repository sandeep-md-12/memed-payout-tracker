'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Alert, Card, Field, TextInput } from '@/components/common/ui';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/services/api';
import { homeFor } from '@/utils/format';

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(homeFor(user.role));
  }, [ready, user, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      router.replace(homeFor(loggedIn.role));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Email">
            <TextInput type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" loading={submitting} className="w-full">
            Log in
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-slate-600">
        New here?{' '}
        <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
