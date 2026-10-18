'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { Alert, TextInput } from '@/components/common/ui';
import { errorMessage, submissionApi } from '@/services/api';
import type { Campaign } from '@/services/types';

const PLACEHOLDERS = {
  instagram: 'https://www.instagram.com/reel/…',
  youtube: 'https://youtu.be/… or https://youtube.com/shorts/…',
} as const;

export function SubmitPostForm({ campaign }: { campaign: Campaign }) {
  const [postUrl, setPostUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      await submissionApi.submit(campaign.id, postUrl);
      setPostUrl('');
      setResult({ kind: 'success', message: 'Submission created.' });
    } catch (err) {
      setResult({ kind: 'error', message: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <TextInput
          type="url"
          required
          aria-label={`Post link for ${campaign.name}`}
          placeholder={PLACEHOLDERS[campaign.platform]}
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
        />
        <Button type="submit" loading={submitting} className="shrink-0">
          Submit post
        </Button>
      </div>
      {result?.kind === 'success' && (
        <Alert kind="success">
          {result.message}{' '}
          <Link href="/creator/submissions" className="font-medium underline">
            Track views and earnings →
          </Link>
        </Alert>
      )}
      {result?.kind === 'error' && <Alert kind="error">{result.message}</Alert>}
    </form>
  );
}
