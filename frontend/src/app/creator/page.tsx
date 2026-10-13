'use client';

import { MilestoneLadder } from '@/components/campaigns/MilestoneLadder';
import { SubmitPostForm } from '@/components/campaigns/SubmitPostForm';
import { Alert, Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/common/ui';
import { useApiData } from '@/hooks/useApiData';
import { campaignApi } from '@/services/api';
import { formatRupees, PLATFORM_LABELS } from '@/utils/format';

export default function LiveCampaignsPage() {
  const campaigns = useApiData(() => campaignApi.listLive());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live campaigns"
        subtitle="Post for a campaign, submit the link, and get paid as your views climb the milestone ladder."
      />

      {campaigns.error && <Alert kind="error">{campaigns.error}</Alert>}
      {campaigns.loading && !campaigns.data ? (
        <LoadingState label="Loading live campaigns…" />
      ) : campaigns.data?.length === 0 ? (
        <EmptyState title="No live campaigns right now">Check back soon: brands add new campaigns all the time.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.data?.map((campaign) => (
            <Card key={campaign.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{campaign.name}</h2>
                  <p className="text-sm text-slate-500">by {campaign.brandName}</p>
                </div>
                <Badge tone="blue">{PLATFORM_LABELS[campaign.platform]}</Badge>
              </div>
              <MilestoneLadder milestones={campaign.milestones} />
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">{formatRupees(campaign.remaining)}</strong> of{' '}
                {formatRupees(campaign.budget)} budget left. Payouts are first come, first served.
              </p>
              <SubmitPostForm campaign={campaign} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
