'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CreateCampaignForm } from '@/components/campaigns/CreateCampaignForm';
import { MilestoneLadder } from '@/components/campaigns/MilestoneLadder';
import { BudgetBar } from '@/components/common/BudgetBar';
import { Button } from '@/components/common/Button';
import { Alert, Badge, Card, EmptyState, LoadingState, PageHeader } from '@/components/common/ui';
import { useApiData } from '@/hooks/useApiData';
import { campaignApi } from '@/services/api';
import { PLATFORM_LABELS } from '@/utils/format';

export default function BrandCampaignsPage() {
  const campaigns = useApiData(() => campaignApi.listMine());
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My campaigns"
        subtitle="Budget spent vs remaining for each campaign."
        action={
          !creating && (
            <Button
              onClick={() => {
                setCreating(true);
                setNotice(null);
              }}
            >
              + New campaign
            </Button>
          )
        }
      />

      {creating && (
        <Card>
          <CreateCampaignForm
            onCancel={() => setCreating(false)}
            onCreated={(campaign) => {
              setCreating(false);
              setNotice(`"${campaign.name}" is live. Creators can now submit posts to it.`);
              void campaigns.reload();
            }}
          />
        </Card>
      )}
      {notice && <Alert kind="success">{notice}</Alert>}

      {campaigns.error && <Alert kind="error">{campaigns.error}</Alert>}
      {campaigns.loading && !campaigns.data ? (
        <LoadingState label="Loading your campaigns…" />
      ) : campaigns.data?.length === 0 ? (
        <EmptyState title="No campaigns yet">Create your first campaign to start receiving submissions from creators.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.data?.map((campaign) => (
            <Card key={campaign.id} className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{campaign.name}</h2>
                  <p className="text-sm text-slate-500">{PLATFORM_LABELS[campaign.platform]}</p>
                </div>
                {campaign.isLive ? <Badge tone="green">Live</Badge> : <Badge tone="gray">Exhausted</Badge>}
              </div>
              <BudgetBar spent={campaign.spent} budget={campaign.budget} />
              <MilestoneLadder milestones={campaign.milestones} />
              <Link
                href={`/brand/campaigns/${campaign.id}`}
                className="inline-block text-sm font-medium text-indigo-600 hover:underline"
              >
                View submissions, reviews & payouts →
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
