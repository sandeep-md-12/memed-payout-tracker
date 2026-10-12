import { model, Schema, type HydratedDocument, type Types } from 'mongoose';
import { SUBMISSION_STATUSES, type SubmissionStatus } from '../utils/constants';

/** Why a Submission was flagged: the Spike that triggered it. */
export interface SubmissionFlag {
  viewsGained: number;
  minutes: number;
  flaggedAt: Date;
}

export interface Submission {
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  /** Canonical post link (see utils/url.ts); unique across all Campaigns. */
  postUrl: string;
  views: number;
  /** When `views` last changed; the baseline for Spike detection. Starts at submission time. */
  viewsUpdatedAt: Date;
  /** Amount of the highest Milestone the current View Count has reached. */
  amountOwed: number;
  /** The Payout: what this Submission has actually been credited. Shortfall = amountOwed - paid. */
  paid: number;
  status: SubmissionStatus;
  flag: SubmissionFlag | null;
  createdAt: Date;
  updatedAt: Date;
}

const flagSchema = new Schema<SubmissionFlag>(
  {
    viewsGained: { type: Number, required: true },
    minutes: { type: Number, required: true },
    flaggedAt: { type: Date, required: true },
  },
  { _id: false },
);

const submissionSchema = new Schema<Submission>(
  {
    campaign: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postUrl: { type: String, required: true, unique: true },
    views: { type: Number, required: true, default: 0, min: 0 },
    viewsUpdatedAt: { type: Date, required: true, default: () => new Date() },
    amountOwed: { type: Number, required: true, default: 0, min: 0 },
    paid: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: SUBMISSION_STATUSES, required: true, default: 'active' },
    flag: { type: flagSchema, default: null },
  },
  { timestamps: true },
);

// Listing a Campaign's Submissions oldest-first (also the order Shortfalls are refilled in).
submissionSchema.index({ campaign: 1, createdAt: 1 });

export type SubmissionDocument = HydratedDocument<Submission>;
export const SubmissionModel = model<Submission>('Submission', submissionSchema);
