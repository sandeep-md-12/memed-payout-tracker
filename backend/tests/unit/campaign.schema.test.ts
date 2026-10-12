import { createCampaignSchema } from '../../src/schemas/campaign.schema';

const valid = {
  name: 'Diwali Drop',
  platform: 'instagram',
  budget: 10_000,
  milestones: [
    { views: 100_000, amount: 5_000 },
    { views: 10_000, amount: 500 },
    { views: 50_000, amount: 2_000 },
  ],
};

describe('createCampaignSchema', () => {
  it('accepts milestones in any order and returns them sorted', () => {
    const parsed = createCampaignSchema.parse(valid);
    expect(parsed.milestones.map((m) => m.views)).toEqual([10_000, 50_000, 100_000]);
  });

  it('rejects a ladder whose top payout exceeds the budget', () => {
    const result = createCampaignSchema.safeParse({ ...valid, budget: 4_000 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cannot be more than the budget/);
  });

  it('rejects fractional rupees', () => {
    const result = createCampaignSchema.safeParse({ ...valid, budget: 10_000.5 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty ladder and more than 10 milestones', () => {
    expect(createCampaignSchema.safeParse({ ...valid, milestones: [] }).success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => ({ views: (i + 1) * 1_000, amount: (i + 1) * 10 }));
    expect(createCampaignSchema.safeParse({ ...valid, milestones: eleven }).success).toBe(false);
  });

  it('rejects an unknown platform', () => {
    expect(createCampaignSchema.safeParse({ ...valid, platform: 'tiktok' }).success).toBe(false);
  });
});
