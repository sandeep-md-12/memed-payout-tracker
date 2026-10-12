import request from 'supertest';
import { CampaignModel, PayoutEntryModel, SubmissionModel } from '../../src/models';
import { app, createCampaign, createUser, reportViews, submitPost, type TestUser } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let brand: TestUser;
let creator: TestUser;

beforeEach(async () => {
  brand = await createUser('brand');
  creator = await createUser('creator');
});

/** Budget Spent must always equal the sum of the Campaign's Payout Entries. */
async function expectLedgerBalanced(campaignId: string) {
  const campaign = await CampaignModel.findById(campaignId).lean();
  const entries = await PayoutEntryModel.find({ campaign: campaignId }).lean();
  const submissions = await SubmissionModel.find({ campaign: campaignId }).lean();
  const entrySum = entries.reduce((sum, e) => sum + e.amount, 0);
  const paidSum = submissions.reduce((sum, s) => sum + s.paid, 0);
  expect(campaign!.spent).toBe(entrySum);
  expect(campaign!.spent).toBe(paidSum);
  expect(campaign!.spent).toBeLessThanOrEqual(campaign!.budget);
}

describe('PATCH /api/submissions/:id/views', () => {
  let campaignId: string;
  let submissionId: string;

  beforeEach(async () => {
    campaignId = (await createCampaign(brand)).id; // ₹10,000; 10K → 500, 50K → 2,000, 100K → 5,000
    submissionId = (await submitPost(creator, campaignId)).id;
  });

  it('pays nothing below the first milestone', async () => {
    const res = await reportViews(submissionId, 9_999);
    expect(res.body.data).toMatchObject({ payoutChange: 0, submission: { views: 9_999, paid: 0 } });
  });

  it('pays the milestone amount once the threshold is reached', async () => {
    const res = await reportViews(submissionId, 12_000);
    expect(res.body.data).toMatchObject({
      payoutChange: 500,
      submission: { amountOwed: 500, paid: 500 },
      campaign: { spent: 500, remaining: 9_500, isLive: true },
    });
  });

  it('tops up to the next milestone instead of adding it on top', async () => {
    await reportViews(submissionId, 12_000);
    const res = await reportViews(submissionId, 60_000);
    expect(res.body.data).toMatchObject({ payoutChange: 1_500, submission: { paid: 2_000 } });
  });

  it('pays only the highest milestone when one update crosses several', async () => {
    const res = await reportViews(submissionId, 120_000);
    expect(res.body.data).toMatchObject({ payoutChange: 5_000, submission: { paid: 5_000 } });
  });

  it('never double-pays when the same update is repeated', async () => {
    await reportViews(submissionId, 60_000);
    const again = await reportViews(submissionId, 60_000);
    expect(again.body.data.payoutChange).toBe(0);
    expect(await PayoutEntryModel.countDocuments({ submission: submissionId })).toBe(1);
  });

  it('claws money back when views drop below a milestone', async () => {
    await reportViews(submissionId, 60_000);
    const res = await reportViews(submissionId, 40_000);
    expect(res.body.data).toMatchObject({
      payoutChange: -1_500,
      submission: { amountOwed: 500, paid: 500 },
      campaign: { spent: 500 },
    });
    await expectLedgerBalanced(campaignId);
  });

  it('pays again (but only once) when views climb back', async () => {
    await reportViews(submissionId, 60_000);
    await reportViews(submissionId, 40_000);
    const res = await reportViews(submissionId, 60_000);
    expect(res.body.data.submission.paid).toBe(2_000);
    await expectLedgerBalanced(campaignId);
  });

  it('rejects invalid view counts', async () => {
    for (const views of [-1, 1.5, '100']) {
      const res = await request(app).patch(`/api/submissions/${submissionId}/views`).send({ views }).expect(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('returns 404 for an unknown submission', async () => {
    const res = await reportViews('64b7f0c2a1b2c3d4e5f60718', 100, { sudden: true, expectStatus: 404 });
    expect(res.body.code).toBe('SUBMISSION_NOT_FOUND');
  });
});

describe('budget cap, shortfalls and refills', () => {
  // ₹2,500 budget: room for one ₹2,000 payout plus ₹500.
  const smallLadder = [
    { views: 10_000, amount: 500 },
    { views: 50_000, amount: 2_000 },
  ];
  let campaignId: string;
  let first: string;
  let second: string;

  beforeEach(async () => {
    campaignId = (await createCampaign(brand, { budget: 2_500, milestones: smallLadder })).id;
    first = (await submitPost(creator, campaignId)).id;
    second = (await submitPost(creator, campaignId)).id;
  });

  it('pays only what is left when the budget runs out mid-payout, and records the shortfall', async () => {
    await reportViews(first, 60_000);
    const res = await reportViews(second, 60_000);

    expect(res.body.data).toMatchObject({
      payoutChange: 500,
      submission: { amountOwed: 2_000, paid: 500, shortfall: 1_500 },
      campaign: { spent: 2_500, remaining: 0, isLive: false },
    });
    const entry = await PayoutEntryModel.findOne({ submission: second }).lean();
    expect(entry).toMatchObject({ amount: 500, reason: 'budget_cap' });
  });

  it('hides an exhausted campaign from creators and refuses new posts', async () => {
    await reportViews(first, 60_000);
    await reportViews(second, 60_000);

    const list = await request(app).get('/api/campaigns').set(creator.auth).expect(200);
    expect(list.body.data).toEqual([]);
    const late = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set(creator.auth)
      .send({ postUrl: 'https://www.instagram.com/reel/TooLate/' })
      .expect(409);
    expect(late.body.code).toBe('CAMPAIGN_NOT_LIVE');
  });

  it('gives clawed-back money to the oldest short submission first, and reopens the campaign', async () => {
    const third = (await submitPost(creator, campaignId)).id;
    await reportViews(first, 60_000); // paid 2,000
    await reportViews(second, 60_000); // paid 500, short 1,500
    await reportViews(third, 12_000); // budget gone: paid 0, short 500

    // First post drops to 0 views: ₹2,000 comes back.
    const res = await reportViews(first, 0);
    expect(res.body.data).toMatchObject({ payoutChange: -2_000, submission: { paid: 0 } });

    const after = await SubmissionModel.find({ _id: { $in: [second, third] } }).sort({ createdAt: 1 }).lean();
    expect(after.map((s) => s.paid)).toEqual([2_000, 500]); // oldest (second) filled first, then third
    const campaign = await CampaignModel.findById(campaignId).lean();
    expect(campaign!.spent).toBe(2_500);

    const refills = await PayoutEntryModel.find({ reason: 'shortfall_refill' }).sort({ _id: 1 }).lean();
    expect(refills.map((e) => e.amount)).toEqual([1_500, 500]);
    await expectLedgerBalanced(campaignId);
  });

  it('reopens an exhausted campaign when money comes back and nobody is short', async () => {
    await reportViews(first, 60_000);
    await reportViews(second, 12_000); // spent 2,500, nobody short
    const res = await reportViews(first, 12_000); // ₹1,500 returns
    expect(res.body.data.campaign).toMatchObject({ spent: 1_000, remaining: 1_500, isLive: true });
  });
});

describe('payout history', () => {
  it('shows a creator the history of their own submission, and hides it from other creators', async () => {
    const campaignId = (await createCampaign(brand)).id;
    const submissionId = (await submitPost(creator, campaignId)).id;
    await reportViews(submissionId, 12_000);
    await reportViews(submissionId, 60_000);

    const res = await request(app).get(`/api/submissions/${submissionId}/payouts`).set(creator.auth).expect(200);
    expect(res.body.data.map((e: { amount: number; reason: string }) => [e.amount, e.reason])).toEqual([
      [500, 'milestone'],
      [1_500, 'milestone'],
    ]);

    const stranger = await createUser('creator');
    await request(app).get(`/api/submissions/${submissionId}/payouts`).set(stranger.auth).expect(403);

    const brandView = await request(app).get(`/api/campaigns/${campaignId}/payouts`).set(brand.auth).expect(200);
    expect(brandView.body.data).toHaveLength(2);
  });
});
