import request from 'supertest';
import { CampaignModel, PayoutEntryModel, SubmissionModel } from '../../src/models';
import { app, backdateLastReport, createCampaign, createUser, submitPost } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PARALLEL = 20;

function patchViews(submissionId: string, views: number) {
  return request(app).patch(`/api/submissions/${submissionId}/views`).send({ views });
}

describe('simultaneous view updates', () => {
  it(`never overspend the budget when ${PARALLEL} posts are paid at the same instant`, async () => {
    const brand = await createUser('brand');
    const creator = await createUser('creator');
    // Room for exactly 5 payouts of ₹1,000; 20 posts all qualify at once.
    const campaign = await createCampaign(brand, { budget: 5_000, milestones: [{ views: 10_000, amount: 1_000 }] });
    const submissions = [];
    for (let i = 0; i < PARALLEL; i++) submissions.push(await submitPost(creator, campaign.id));
    await Promise.all(submissions.map((s) => backdateLastReport(s.id)));

    const responses = await Promise.all(submissions.map((s) => patchViews(s.id, 20_000)));

    expect(responses.every((r) => r.status === 200)).toBe(true);
    const saved = await CampaignModel.findById(campaign.id).lean();
    const paid = await SubmissionModel.find({ campaign: campaign.id }).lean();
    const entries = await PayoutEntryModel.find({ campaign: campaign.id }).lean();

    expect(saved!.spent).toBe(5_000);
    expect(paid.reduce((sum, s) => sum + s.paid, 0)).toBe(5_000);
    expect(entries.reduce((sum, e) => sum + e.amount, 0)).toBe(5_000);
    expect(paid.filter((s) => s.paid === 1_000)).toHaveLength(5);
  });

  it(`pay a post only once when the same update arrives ${PARALLEL} times at once`, async () => {
    const brand = await createUser('brand');
    const creator = await createUser('creator');
    const campaign = await createCampaign(brand);
    const { id } = await submitPost(creator, campaign.id);
    await backdateLastReport(id);

    const responses = await Promise.all(Array.from({ length: PARALLEL }, () => patchViews(id, 60_000)));

    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(responses.reduce((sum, r) => sum + r.body.data.payoutChange, 0)).toBe(2_000);
    expect((await SubmissionModel.findById(id).lean())!.paid).toBe(2_000);
    expect(await PayoutEntryModel.countDocuments({ submission: id })).toBe(1);
    expect((await CampaignModel.findById(campaign.id).lean())!.spent).toBe(2_000);
  });
});
