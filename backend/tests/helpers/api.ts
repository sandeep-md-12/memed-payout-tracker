import request from 'supertest';
import { createApp } from '../../src/app';
import { SubmissionModel } from '../../src/models';
import type { Role } from '../../src/utils/constants';

export const app = createApp();

let userCounter = 0;

export interface TestUser {
  id: string;
  token: string;
  auth: { Authorization: string };
}

export async function createUser(role: Role, name = `${role} ${++userCounter}`): Promise<TestUser> {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name, email: `${role}${userCounter}-${Date.now()}@test.dev`, password: 'password123', role })
    .expect(201);
  const { token, user } = res.body.data;
  return { id: user.id, token, auth: { Authorization: `Bearer ${token}` } };
}

export const sampleCampaign = {
  name: 'Diwali Drop',
  platform: 'instagram',
  budget: 10_000,
  milestones: [
    { views: 10_000, amount: 500 },
    { views: 50_000, amount: 2_000 },
    { views: 100_000, amount: 5_000 },
  ],
};

export async function createCampaign(brand: TestUser, overrides: Partial<typeof sampleCampaign> = {}) {
  const res = await request(app)
    .post('/api/campaigns')
    .set(brand.auth)
    .send({ ...sampleCampaign, ...overrides })
    .expect(201);
  return res.body.data as { id: string; budget: number };
}

let postCounter = 0;

export async function submitPost(creator: TestUser, campaignId: string, postUrl?: string) {
  const res = await request(app)
    .post(`/api/campaigns/${campaignId}/submissions`)
    .set(creator.auth)
    .send({ postUrl: postUrl ?? `https://www.instagram.com/reel/post${++postCounter}x${Date.now()}/` })
    .expect(201);
  return res.body.data as { id: string };
}

/** Pretends the previous View Count report was `hours` ago, so the next report isn't a Spike. */
export async function backdateLastReport(submissionId: string, hours = 24): Promise<void> {
  await SubmissionModel.updateOne(
    { _id: submissionId },
    { viewsUpdatedAt: new Date(Date.now() - hours * 3_600_000) },
  );
}

/**
 * Sends a View Count update the way the platform would. By default the previous report is moved
 * a day into the past so the update grows at a normal pace; pass `{ sudden: true }` to test Spikes.
 */
export async function reportViews(
  submissionId: string,
  views: number,
  { sudden = false, expectStatus = 200 } = {},
): Promise<request.Response> {
  if (!sudden) await backdateLastReport(submissionId);
  return request(app).patch(`/api/submissions/${submissionId}/views`).send({ views }).expect(expectStatus);
}
