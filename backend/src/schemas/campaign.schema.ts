import { z } from 'zod';
import { PLATFORMS, type Platform } from '../utils/constants';
import { findLadderProblems, sortLadder, type Milestone } from '../services/payout.calculator';

const rupees = z
  .number('Must be a number')
  .int('Must be a whole number of rupees')
  .positive('Must be more than 0')
  .max(1_000_000_000);

const milestoneSchema = z.object({
  views: z.number('Must be a number').int('Views must be a whole number').positive('Views must be more than 0'),
  amount: rupees,
});

/** Milestones may arrive in any order; they're checked and stored sorted by view threshold. */
export const createCampaignSchema = z
  .object({
    name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100),
    platform: z.enum(PLATFORMS, 'Platform must be instagram or youtube'),
    budget: rupees,
    milestones: z.array(milestoneSchema).min(1, 'Add at least one milestone').max(10, 'At most 10 milestones'),
  })
  .superRefine((campaign, ctx) => {
    for (const message of findLadderProblems(sortLadder(campaign.milestones), campaign.budget)) {
      ctx.addIssue({ code: 'custom', path: ['milestones'], message });
    }
  })
  .transform((campaign) => ({ ...campaign, milestones: sortLadder(campaign.milestones) }));
export type CreateCampaignInput = z.output<typeof createCampaignSchema>;

export interface CampaignResponse {
  id: string;
  name: string;
  platform: Platform;
  budget: number;
  spent: number;
  remaining: number;
  isLive: boolean;
  milestones: Milestone[];
  brandName?: string;
  createdAt: Date;
}
