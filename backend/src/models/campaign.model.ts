import { model, Schema, type HydratedDocument, type Types } from 'mongoose';
import { PLATFORMS, type Platform } from '../utils/constants';
import type { Milestone } from '../services/payout.calculator';

export interface Campaign {
  brand: Types.ObjectId;
  name: string;
  platform: Platform;
  /** Whole rupees. Fixed at creation. */
  budget: number;
  /** Budget Spent: always equals the sum of this Campaign's Payout Entries. */
  spent: number;
  /** Milestone Ladder, stored sorted by view threshold. Fixed at creation. */
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<Milestone>(
  {
    views: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const campaignSchema = new Schema<Campaign>(
  {
    brand: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    platform: { type: String, enum: PLATFORMS, required: true },
    budget: { type: Number, required: true, min: 1 },
    spent: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      // Last line of defence: if a bug ever tried to overspend, the save (and its transaction) fails.
      validate: {
        validator(this: Campaign, spent: number) {
          return spent <= this.budget;
        },
        message: 'Budget Spent cannot exceed the Budget',
      },
    },
    milestones: { type: [milestoneSchema], required: true },
  },
  { timestamps: true },
);

export type CampaignDocument = HydratedDocument<Campaign>;
export const CampaignModel = model<Campaign>('Campaign', campaignSchema);
