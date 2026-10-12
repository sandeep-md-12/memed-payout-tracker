import request from 'supertest';
import { CampaignModel } from '../../src/models';
import { app, createCampaign, createUser, sampleCampaign, type TestUser } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('POST /api/campaigns', () => {
  let brand: TestUser;
  beforeEach(async () => {
    brand = await createUser('brand');
  });

  it('creates a campaign with milestones sorted and nothing spent yet', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(brand.auth)
      .send({ ...sampleCampaign, milestones: [...sampleCampaign.milestones].reverse() })
      .expect(201);

    expect(res.body.data).toMatchObject({
      name: 'Diwali Drop',
      platform: 'instagram',
      budget: 10_000,
      spent: 0,
      remaining: 10_000,
      isLive: true,
      milestones: sampleCampaign.milestones,
    });
  });

  it('refuses a top milestone bigger than the budget', async () => {
    const res = await request(app)
      .post('/api/campaigns')
      .set(brand.auth)
      .send({ ...sampleCampaign, budget: 3_000 })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details[0].path).toBe('milestones');
  });

  it('is brand-only', async () => {
    const creator = await createUser('creator');
    const res = await request(app).post('/api/campaigns').set(creator.auth).send(sampleCampaign).expect(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/campaigns/mine', () => {
  it("shows a brand only its own campaigns, with spent vs remaining", async () => {
    const brand = await createUser('brand');
    const otherBrand = await createUser('brand');
    const mine = await createCampaign(brand);
    await createCampaign(otherBrand, { name: 'Not mine' });
    await CampaignModel.updateOne({ _id: mine.id }, { spent: 2_500 });

    const res = await request(app).get('/api/campaigns/mine').set(brand.auth).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: mine.id, spent: 2_500, remaining: 7_500 });
  });
});

describe('GET /api/campaigns (live list for creators)', () => {
  it('lists campaigns with budget left, with the brand name, and hides exhausted ones', async () => {
    const brand = await createUser('brand', 'Acme');
    const creator = await createUser('creator');
    const live = await createCampaign(brand, { name: 'Live one' });
    const exhausted = await createCampaign(brand, { name: 'Exhausted one' });
    await CampaignModel.updateOne({ _id: exhausted.id }, { spent: 10_000 });

    const res = await request(app).get('/api/campaigns').set(creator.auth).expect(200);

    expect(res.body.data.map((c: { id: string }) => c.id)).toEqual([live.id]);
    expect(res.body.data[0].brandName).toBe('Acme');
  });
});
