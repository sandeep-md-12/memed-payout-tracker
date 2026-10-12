import request from 'supertest';
import { PayoutEntryModel, SubmissionModel } from '../../src/models';
import { app, createCampaign, createUser, reportViews, submitPost, type TestUser } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let brand: TestUser;
let creator: TestUser;
let campaignId: string;
let submissionId: string;

beforeEach(async () => {
  brand = await createUser('brand');
  creator = await createUser('creator');
  campaignId = (await createCampaign(brand)).id; // ₹10,000; 10K → 500, 50K → 2,000, 100K → 5,000
  submissionId = (await submitPost(creator, campaignId)).id;
});

const approve = (user: TestUser, id = submissionId) =>
  request(app).post(`/api/submissions/${id}/approve`).set(user.auth);
const reject = (user: TestUser, id = submissionId) => request(app).post(`/api/submissions/${id}/reject`).set(user.auth);

describe('spike flagging', () => {
  it('flags a sudden jump and pays nothing while flagged', async () => {
    const res = await reportViews(submissionId, 60_000, { sudden: true });
    expect(res.body.data).toMatchObject({
      payoutChange: 0,
      submission: { status: 'flagged', views: 60_000, amountOwed: 2_000, paid: 0, shortfall: 0 },
    });
    expect(res.body.data.submission.flag).toMatchObject({ viewsGained: 60_000 });

    const earnings = await request(app).get('/api/creators/me/earnings').set(creator.auth).expect(200);
    expect(earnings.body.data).toMatchObject({ totalEarnings: 0, pendingReview: 2_000 });
  });

  it('keeps recording views but moves no money until the brand reviews', async () => {
    await reportViews(submissionId, 60_000, { sudden: true });
    const res = await reportViews(submissionId, 120_000);
    expect(res.body.data).toMatchObject({ payoutChange: 0, submission: { status: 'flagged', views: 120_000, paid: 0 } });
  });

  it('does not flag growth at a normal pace', async () => {
    const res = await reportViews(submissionId, 60_000);
    expect(res.body.data.submission.status).toBe('active');
  });
});

describe('POST /api/submissions/:id/approve', () => {
  beforeEach(async () => {
    await reportViews(submissionId, 60_000, { sudden: true });
  });

  it('clears the flag and catches the payout up to the current views', async () => {
    const res = await approve(brand).expect(200);
    expect(res.body.data).toMatchObject({
      payoutChange: 2_000,
      submission: { status: 'active', flag: null, paid: 2_000 },
    });
    const entry = await PayoutEntryModel.findOne({ submission: submissionId }).lean();
    expect(entry).toMatchObject({ amount: 2_000, reason: 'review_approved' });
  });

  it('can flag the same submission again on a later spike', async () => {
    await approve(brand).expect(200);
    const res = await reportViews(submissionId, 200_000, { sudden: true });
    expect(res.body.data.submission.status).toBe('flagged');
  });

  it("is limited to the campaign's own brand", async () => {
    const otherBrand = await createUser('brand');
    const res = await approve(otherBrand).expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
    await approve(creator).expect(403);
  });

  it('refuses to review a submission that is not flagged', async () => {
    await approve(brand).expect(200);
    const res = await approve(brand).expect(409);
    expect(res.body.code).toBe('SUBMISSION_NOT_FLAGGED');
  });
});

describe('POST /api/submissions/:id/reject', () => {
  it('returns the whole payout to the campaign and stops all future earnings', async () => {
    // Paid ₹2,000 at a normal pace, then a sudden jump gets it flagged.
    await reportViews(submissionId, 60_000);
    await reportViews(submissionId, 300_000, { sudden: true });

    const res = await reject(brand).expect(200);
    expect(res.body.data).toMatchObject({
      payoutChange: -2_000,
      submission: { status: 'rejected', paid: 0, amountOwed: 0 },
      campaign: { spent: 0 },
    });

    const later = await reportViews(submissionId, 500_000);
    expect(later.body.data).toMatchObject({ payoutChange: 0, submission: { status: 'rejected', paid: 0 } });
  });

  it('gives the returned money to older submissions that were short', async () => {
    const tight = (await createCampaign(brand, { budget: 2_000, milestones: [{ views: 10_000, amount: 2_000 }] })).id;
    const older = (await submitPost(creator, tight)).id;
    const suspicious = (await submitPost(creator, tight)).id;

    await reportViews(suspicious, 20_000); // takes the whole ₹2,000
    await reportViews(older, 20_000); // nothing left: short ₹2,000
    await reportViews(suspicious, 400_000, { sudden: true }); // flagged
    await reject(brand, suspicious).expect(200);

    const olderNow = await SubmissionModel.findById(older).lean();
    expect(olderNow!.paid).toBe(2_000);
  });
});
