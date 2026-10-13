'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Alert, Card, Field, TextInput } from '@/components/common/ui';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/services/api';
import type { Role } from '@/services/types';
import { homeFor } from '@/utils/format';

const ROLE_OPTIONS: Array<{ role: Role; title: string; description: string }> = [
  { role: 'brand', title: 'Brand', description: 'Run campaigns and pay creators per milestone.' },
  { role: 'creator', title: 'Creator', description: 'Submit your posts to campaigns and earn.' },
];

export default function SignupPage() {
  const { user, ready, signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'creator' as Role });
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
      const created = await signup(form);
      router.replace(homeFor(created.role));
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">I am a…</legend>
            <div className="grid grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.role}
                  className={`cursor-pointer rounded-md border p-3 text-sm ${
                    form.role === option.role ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.role}
                    checked={form.role === option.role}
                    onChange={() => setForm({ ...form, role: option.role })}
                    className="sr-only"
                  />
                  <span className="block font-medium">{option.title}</span>
                  <span className="text-slate-500">{option.description}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">The role can&apos;t be changed later.</p>
          </fieldset>

          <Field label={form.role === 'brand' ? 'Brand name' : 'Name or page name'}>
            <TextInput required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <TextInput
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Button type="submit" loading={submitting} className="w-full">
            Create account
          </Button>
        </form>
      </Card>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
