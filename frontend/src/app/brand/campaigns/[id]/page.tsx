'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { MilestoneLadder } from '@/components/campaigns/MilestoneLadder';
import { BudgetBar } from '@/components/common/BudgetBar';
import { Button } from '@/components/common/Button';
import { Alert, Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/common/ui';
import { PayoutHistory } from '@/components/submissions/PayoutHistory';
import { SimulateViews } from '@/components/submissions/SimulateViews';
import { StatusBadge } from '@/components/submissions/StatusBadge';
import { useApiData } from '@/hooks/useApiData';
import { campaignApi, errorMessage, submissionApi } from '@/services/api';
import type { Submission } from '@/services/types';
import { describeSpike, formatRupees, formatViews, PLATFORM_LABELS } from '@/utils/format';

export default function BrandCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const campaigns = useApiData(() => campaignApi.listMine(), [id]);
  const submissions = useApiData(() => campaignApi.submissions(id), [id]);
  const payouts = useApiData(() => campaignApi.payouts(id), [id]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const campaign = campaigns.data?.find((c) => c.id === id);
  const flagged = submissions.data?.filter((s) => s.status === 'flagged') ?? [];
  const refreshAll = () => Promise.all([campaigns.reload(), submissions.reload(), payouts.reload()]).then(() => undefined);

  async function review(submission: Submission, decision: 'approve' | 'reject') {
    if (
      decision === 'reject' &&
      !window.confirm(`Reject this submission? Its ${formatRupees(submission.paid)} payout returns to the budget and it can never earn again.`)
    ) {
      return;
    }
    setReviewing(submission.id);
    setMessage(null);
    try {
      const result = await (decision === 'approve' ? submissionApi.approve(submission.id) : submissionApi.reject(submission.id));
      const change = result.payoutChange;
      setMessage({
        kind: 'success',
        text:
          decision === 'approve'
            ? `Approved. ${change > 0 ? `${formatRupees(change)} paid to ${submission.creator?.name}.` : 'No payment was due.'}`
            : `Rejected. ${change < 0 ? `${formatRupees(-change)} returned to the budget.` : 'Nothing had been paid.'}`,
      });
      await refreshAll();
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setReviewing(null);
    }
  }

  const submissionLabel = (submissionId: string) => {
    const submission = submissions.data?.find((s) => s.id === submissionId);
    return submission ? `${submission.creator?.name ?? 'Creator'} · ${shortUrl(submission.postUrl)}` : 'Submission';
  };

  if (submissions.error && !submissions.data) {
    return (
      <div className="space-y-4">
        <Alert kind="error">{submissions.error}</Alert>
        <Link href="/brand" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to my campaigns
        </Link>
      </div>
    );
  }
  if (!campaign || !submissions.data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <Link href="/brand" className="text-sm text-slate-500 hover:text-slate-900">
        ← My campaigns
      </Link>
      <PageHeader
        title={campaign.name}
        subtitle={`${PLATFORM_LABELS[campaign.platform]} · ${submissions.data.length} submission(s)`}
        action={campaign.isLive ? <Badge tone="green">Live</Badge> : <Badge tone="gray">Exhausted</Badge>}
      />
      <Card className="space-y-4">
        <BudgetBar spent={campaign.spent} budget={campaign.budget} />
        <MilestoneLadder milestones={campaign.milestones} />
      </Card>

      {message && <Alert kind={message.kind}>{message.text}</Alert>}

      {flagged.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Needs your review ({flagged.length})</h2>
          {flagged.map((submission) => (
            <Card key={submission.id} className="space-y-3 border-amber-300 bg-amber-50/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{submission.creator?.name}</p>
                  <a href={submission.postUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                    {shortUrl(submission.postUrl)}
                  </a>
                </div>
                <StatusBadge status="flagged" />
              </div>
              <p className="text-sm text-slate-700">
                Views jumped unusually fast ({submission.flag && describeSpike(submission.flag)}). It now has{' '}
                {formatViews(submission.views)} views. Payouts are paused. Approving pays up to{' '}
                <strong>{formatRupees(submission.amountOwed - submission.paid)}</strong> more (if the budget allows);
                rejecting returns its {formatRupees(submission.paid)} and stops all future payouts.
              </p>
              <div className="flex gap-2">
                <Button variant="success" loading={reviewing === submission.id} onClick={() => review(submission, 'approve')}>
                  Approve
                </Button>
                <Button variant="danger" disabled={reviewing === submission.id} onClick={() => review(submission, 'reject')}>
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Submissions</h2>
        {submissions.data.length === 0 ? (
          <EmptyState title="No submissions yet">Creators will see this campaign while it has budget left.</EmptyState>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Creator / post</th>
                  <th className="px-4 py-2 font-medium">Views</th>
                  <th className="px-4 py-2 font-medium">Owed</th>
                  <th className="px-4 py-2 font-medium">Paid</th>
                  <th className="px-4 py-2 font-medium">Shortfall</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Platform data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.data.map((submission) => (
                  <tr key={submission.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{submission.creator?.name}</p>
                      <a href={submission.postUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                        {shortUrl(submission.postUrl)}
                      </a>
                    </td>
                    <td className="px-4 py-3">{formatViews(submission.views)}</td>
                    <td className="px-4 py-3">{formatRupees(submission.amountOwed)}</td>
                    <td className="px-4 py-3 font-medium">{formatRupees(submission.paid)}</td>
                    <td className="px-4 py-3">{submission.shortfall > 0 ? formatRupees(submission.shortfall) : '–'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={submission.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SimulateViews
                        key={submission.id}
                        submission={submission}
                        onUpdated={() => {
                          setMessage(null);
                          return refreshAll();
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payout history</h2>
        <Card>
          {payouts.data ? <PayoutHistory entries={payouts.data} submissionLabel={submissionLabel} /> : <LoadingState />}
        </Card>
      </section>
    </div>
  );
}

function shortUrl(url: string): string {
  return url.replace(/^https:\/\//, '');
}
