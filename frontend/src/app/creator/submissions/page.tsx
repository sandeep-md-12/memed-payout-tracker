'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert, Card, EmptyState, LoadingState, PageHeader, Stat } from '@/components/common/ui';
import { PayoutHistory } from '@/components/submissions/PayoutHistory';
import { SimulateViews } from '@/components/submissions/SimulateViews';
import { StatusBadge } from '@/components/submissions/StatusBadge';
import { useApiData } from '@/hooks/useApiData';
import { creatorApi, errorMessage, submissionApi } from '@/services/api';
import type { PayoutEntry, Submission } from '@/services/types';
import { describeSpike, formatRupees, formatViews, PLATFORM_LABELS } from '@/utils/format';

export default function MySubmissionsPage() {
  const earnings = useApiData(() => creatorApi.earnings());
  const submissions = useApiData(() => submissionApi.listMine());
  const refreshAll = () => Promise.all([earnings.reload(), submissions.reload()]).then(() => undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="My submissions & earnings" />

      {earnings.data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total earnings" value={formatRupees(earnings.data.totalEarnings)} />
          <Stat label="Submissions" value={earnings.data.submissionCount} />
          <Stat label="Shortfall" value={formatRupees(earnings.data.totalShortfall)} hint="Earned, but the campaign's budget ran out" />
          <Stat label="Pending review" value={formatRupees(earnings.data.pendingReview)} hint="Paused while a brand reviews a view spike" />
        </div>
      )}

      {(submissions.error || earnings.error) && <Alert kind="error">{submissions.error ?? earnings.error}</Alert>}
      {submissions.loading && !submissions.data ? (
        <LoadingState label="Loading your submissions…" />
      ) : submissions.data?.length === 0 ? (
        <EmptyState title="You haven't made any submissions yet">
          <Link href="/creator" className="font-medium text-indigo-600 hover:underline">
            Browse live campaigns →
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {submissions.data?.map((submission) => (
            <SubmissionCard key={submission.id} submission={submission} onUpdated={refreshAll} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ submission, onUpdated }: { submission: Submission; onUpdated: () => Promise<void> }) {
  const [history, setHistory] = useState<PayoutEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  async function loadHistory() {
    try {
      setHistory(await submissionApi.payouts(submission.id));
      setHistoryError(null);
    } catch (err) {
      setHistoryError(errorMessage(err));
    }
  }

  async function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) await loadHistory();
  }

  async function handleUpdated() {
    await onUpdated();
    if (showHistory) await loadHistory();
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {submission.campaign?.name}{' '}
            <span className="text-sm font-normal text-slate-500">
              · {submission.campaign && PLATFORM_LABELS[submission.campaign.platform]}
            </span>
          </p>
          <a href={submission.postUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
            {submission.postUrl.replace(/^https:\/\//, '')}
          </a>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {submission.status === 'flagged' && submission.flag && (
        <Alert kind="warning">
          Paused: views jumped {describeSpike(submission.flag)}. Payouts resume if the brand approves it.
        </Alert>
      )}
      {submission.status === 'rejected' && (
        <Alert kind="error">The brand rejected this submission after a view spike, so it no longer earns.</Alert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
          <Metric label="Views" value={formatViews(submission.views)} />
          <Metric label="Owed" value={formatRupees(submission.amountOwed)} />
          <Metric label="Paid" value={formatRupees(submission.paid)} strong />
          <Metric label="Shortfall" value={submission.shortfall > 0 ? formatRupees(submission.shortfall) : '–'} />
        </dl>
        <SimulateViews submission={submission} onUpdated={handleUpdated} />
      </div>

      <button onClick={toggleHistory} className="text-sm font-medium text-indigo-600 hover:underline">
        {showHistory ? 'Hide payout history' : 'Show payout history'}
      </button>
      {showHistory &&
        (historyError ? (
          <Alert kind="error">{historyError}</Alert>
        ) : history ? (
          <PayoutHistory entries={history} />
        ) : (
          <LoadingState />
        ))}
    </Card>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  );
}
