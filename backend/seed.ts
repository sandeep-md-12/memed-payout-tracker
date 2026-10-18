/**
 * Demo data for trying the app: one brand, two creators, and posts in every interesting state
 * (fully paid, partly paid because the budget ran out, flagged for review).
 *
 *   npm run seed          (uses MONGODB_URI from .env)
 *
 * Safe to re-run: it does nothing if the demo brand already exists.
 * It goes through the same services as the API, so every rupee has a Payout Entry.
 */
import { connectMongo, disconnectMongo } from './src/database/mongo';
import { UserModel } from './src/models';
import { createCampaignSchema } from './src/schemas/campaign.schema';
import { authService } from './src/services/auth.service';
import { campaignService } from './src/services/campaign.service';
import { payoutService } from './src/services/payout.service';
import { submissionService } from './src/services/submission.service';
import { config } from './src/utils/config';

/** Test-only accounts, also listed in the README. */
export const DEMO_PASSWORD = 'demo1234';
export const DEMO_ACCOUNTS = {
  brand: { name: 'Acme Snacks', email: 'brand.demo@example.com', role: 'brand' },
  creator: { name: 'Desi Memes Daily', email: 'creator.demo@example.com', role: 'creator' },
  otherCreator: { name: 'Clip Kings', email: 'creator2.demo@example.com', role: 'creator' },
} as const;

async function signup(account: (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS]): Promise<string> {
  const { user } = await authService.signup({ ...account, password: DEMO_PASSWORD });
  return user.id;
}

async function seed(): Promise<void> {
  if (await UserModel.exists({ email: DEMO_ACCOUNTS.brand.email })) {
    console.log('Demo data already present; nothing to do.');
    return;
  }

  const brandId = await signup(DEMO_ACCOUNTS.brand);
  const creatorId = await signup(DEMO_ACCOUNTS.creator);
  const otherCreatorId = await signup(DEMO_ACCOUNTS.otherCreator);

  // Instagram campaign with plenty of budget left.
  const diwali = await campaignService.create(
    brandId,
    createCampaignSchema.parse({
      name: 'Diwali Snack Drop',
      platform: 'instagram',
      budget: 10_000,
      milestones: [
        { views: 10_000, amount: 500 },
        { views: 50_000, amount: 2_000 },
        { views: 100_000, amount: 5_000 },
      ],
    }),
  );
  const paidReel = await submissionService.submit(creatorId, diwali.id, { postUrl: 'https://www.instagram.com/reel/DemoDiwali1/' });
  await payoutService.updateViews(paidReel.id, 62_000); // first report is never a Spike: ₹2,000 paid
  const topReel = await submissionService.submit(otherCreatorId, diwali.id, { postUrl: 'https://www.instagram.com/reel/DemoDiwali2/' });
  await payoutService.updateViews(topReel.id, 130_000); // ₹5,000 paid
  const spikyReel = await submissionService.submit(creatorId, diwali.id, { postUrl: 'https://www.instagram.com/reel/DemoDiwali3/' });
  await payoutService.updateViews(spikyReel.id, 3_000); // a quiet first report sets the baseline
  await payoutService.updateViews(spikyReel.id, 80_000); // +77K a moment later: flagged for review

  // Small YouTube campaign whose budget runs out mid-payout.
  const cricket = await campaignService.create(
    brandId,
    createCampaignSchema.parse({
      name: 'Cricket Season Clips',
      platform: 'youtube',
      budget: 3_000,
      milestones: [
        { views: 20_000, amount: 1_000 },
        { views: 100_000, amount: 2_500 },
      ],
    }),
  );
  const viralClip = await submissionService.submit(otherCreatorId, cricket.id, { postUrl: 'https://youtu.be/DemoCricket1' });
  await payoutService.updateViews(viralClip.id, 150_000); // ₹2,500 paid
  const lateClip = await submissionService.submit(creatorId, cricket.id, { postUrl: 'https://youtube.com/shorts/DemoCricket2' });
  await payoutService.updateViews(lateClip.id, 30_000); // owed ₹1,000, only ₹500 left: ₹500 short, campaign used up

  console.log('Demo data created. Log in with the accounts listed in seed.ts / the README.');
}

connectMongo(config.MONGODB_URI)
  .then(seed)
  .catch((err: unknown) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(disconnectMongo);
