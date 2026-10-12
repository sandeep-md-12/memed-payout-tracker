import request from 'supertest';
import { CampaignModel, SubmissionModel } from '../../src/models';
import { app, createCampaign, createUser, submitPost, type TestUser } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

let brand: TestUser;
let creator: TestUser;
let campaignId: string;

beforeEach(async () => {
  brand = await createUser('brand');
  creator = await createUser('creator', 'Meme Lord');
  campaignId = (await createCampaign(brand)).id;
});

function submit(postUrl: string, id = campaignId) {
  return request(app).post(`/api/campaigns/${id}/submissions`).set(creator.auth).send({ postUrl });
}

describe('POST /api/campaigns/:id/submissions', () => {
  it('stores the post with a canonical link and nothing earned yet', async () => {
    const res = await submit('https://www.instagram.com/reel/Abc123/?igsh=xyz').expect(201);
    expect(res.body.data).toMatchObject({
      postUrl: 'https://instagram.com/reel/Abc123',
      views: 0,
      amountOwed: 0,
      paid: 0,
      status: 'active',
      campaign: { id: campaignId, name: 'Diwali Drop', platform: 'instagram' },
    });
  });

  it('rejects the same post again, even when the link is written differently', async () => {
    await submit('https://www.instagram.com/reel/Abc123/').expect(201);
    const res = await submit('http://instagram.com/reel/Abc123?utm_source=x').expect(409);
    expect(res.body.code).toBe('POST_ALREADY_SUBMITTED');
  });

  it("rejects a link from a different platform than the campaign's", async () => {
    const res = await submit('https://youtu.be/dQw4w9WgXcQ').expect(400);
    expect(res.body.code).toBe('PLATFORM_MISMATCH');
  });

  it('rejects posts to a campaign whose budget is used up', async () => {
    await CampaignModel.updateOne({ _id: campaignId }, { spent: 10_000 });
    const res = await submit('https://www.instagram.com/reel/Late1/').expect(409);
    expect(res.body.code).toBe('CAMPAIGN_NOT_LIVE');
  });

  it('returns 404 for an unknown campaign and 400 for a malformed id', async () => {
    const notFound = await submit('https://www.instagram.com/reel/X1/', '64b7f0c2a1b2c3d4e5f60718').expect(404);
    expect(notFound.body.code).toBe('CAMPAIGN_NOT_FOUND');
    const badId = await submit('https://www.instagram.com/reel/X1/', 'abc').expect(400);
    expect(badId.body.code).toBe('VALIDATION_ERROR');
  });

  it('lets a creator submit several different posts to one campaign', async () => {
    await submit('https://www.instagram.com/reel/One/').expect(201);
    await submit('https://www.instagram.com/reel/Two/').expect(201);
    expect(await SubmissionModel.countDocuments({ campaign: campaignId })).toBe(2);
  });

  it('is creator-only', async () => {
    await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set(brand.auth)
      .send({ postUrl: 'https://www.instagram.com/reel/B1/' })
      .expect(403);
  });
});

describe('GET /api/submissions/mine and GET /api/creators/me/earnings', () => {
  it("returns the creator's posts and totals", async () => {
    const first = await submitPost(creator, campaignId);
    const second = await submitPost(creator, campaignId);
    // Simulate earlier payouts: one fully paid, one short because the budget ran out.
    await SubmissionModel.updateOne({ _id: first.id }, { amountOwed: 2_000, paid: 2_000 });
    await SubmissionModel.updateOne({ _id: second.id }, { amountOwed: 500, paid: 200 });

    const mine = await request(app).get('/api/submissions/mine').set(creator.auth).expect(200);
    expect(mine.body.data).toHaveLength(2);

    const earnings = await request(app).get('/api/creators/me/earnings').set(creator.auth).expect(200);
    expect(earnings.body.data).toEqual({
      totalEarnings: 2_200,
      totalShortfall: 300,
      pendingReview: 0,
      submissionCount: 2,
    });
  });

  it('returns zeros for a creator with no posts', async () => {
    const res = await request(app).get('/api/creators/me/earnings').set(creator.auth).expect(200);
    expect(res.body.data).toEqual({ totalEarnings: 0, totalShortfall: 0, pendingReview: 0, submissionCount: 0 });
  });
});

describe('GET /api/campaigns/:id/submissions', () => {
  it("shows the owning brand every post with the creator's name", async () => {
    await submitPost(creator, campaignId);
    const res = await request(app).get(`/api/campaigns/${campaignId}/submissions`).set(brand.auth).expect(200);
    expect(res.body.data[0].creator.name).toBe('Meme Lord');
  });

  it("hides another brand's campaign", async () => {
    const otherBrand = await createUser('brand');
    const res = await request(app).get(`/api/campaigns/${campaignId}/submissions`).set(otherBrand.auth).expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});
