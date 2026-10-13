'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/common/Button';
import { TextInput } from '@/components/common/ui';
import { errorMessage, submissionApi } from '@/services/api';
import type { PayoutResult, Submission } from '@/services/types';
import { formatRupees } from '@/utils/format';

type Outcome = { tone: 'success' | 'warning' | 'info' | 'error'; text: string };

const TONE_CLASS: Record<Outcome['tone'], string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  info: 'text-slate-600',
  error: 'text-rose-700',
};

function describe(result: PayoutResult): Outcome {
  const { submission, payoutChange } = result;
  if (submission.status === 'rejected') return { tone: 'info', text: 'Views recorded. This post was rejected, so it earns nothing.' };
  if (submission.status === 'flagged') return { tone: 'warning', text: 'Flagged as a spike: payouts paused until the brand reviews it.' };
  if (payoutChange > 0) {
    const short = submission.shortfall > 0 ? ` (budget ran out: ${formatRupees(submission.shortfall)} short)` : '';
    return { tone: 'success', text: `Paid ${formatRupees(payoutChange)}${short}.` };
  }
  if (payoutChange < 0) return { tone: 'info', text: `Views dropped: ${formatRupees(-payoutChange)} clawed back.` };
  return { tone: 'info', text: 'Views recorded. No payout change.' };
}

/**
 * Stands in for Instagram/YouTube reporting a new view count (PATCH /submissions/:id/views).
 * Clearly labelled so nobody mistakes it for a real feature.
 */
export function SimulateViews({ submission, onUpdated }: { submission: Submission; onUpdated: () => void }) {
  const [views, setViews] = useState(String(submission.views));
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await submissionApi.updateViews(submission.id, Number(views));
      setOutcome(describe(result));
      onUpdated();
    } catch (err) {
      setOutcome({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Simulate platform views</p>
      <div className="flex gap-2">
        <TextInput
          type="number"
          min={0}
          step={1}
          required
          aria-label="New view count"
          value={views}
          onChange={(e) => setViews(e.target.value)}
          className="w-36"
        />
        <Button type="submit" variant="secondary" loading={busy}>
          Update
        </Button>
      </div>
      {outcome && <p className={`text-xs ${TONE_CLASS[outcome.tone]}`}>{outcome.text}</p>}
    </form>
  );
}
