import { z } from 'zod';
import type { Platform, SubmissionStatus } from '../utils/constants';
import type { SubmissionFlag } from '../models/submission.model';

export const createSubmissionSchema = z.object({
  postUrl: z.string('Post link is required').trim().min(1, 'Post link is required').max(500),
});
export type CreateSubmissionInput = z.output<typeof createSubmissionSchema>;

export interface SubmissionResponse {
  id: string;
  postUrl: string;
  views: number;
  amountOwed: number;
  paid: number;
  /** Owed but not paid because the Campaign's budget ran out (active Submissions only). */
  shortfall: number;
  status: SubmissionStatus;
  flag: SubmissionFlag | null;
  /** Null until the platform reports a View Count for the first time. */
  viewsUpdatedAt: Date | null;
  createdAt: Date;
  campaign?: { id: string; name: string; platform: Platform };
  creator?: { id: string; name: string };
}

export interface EarningsResponse {
  /** Sum of the Creator's Payouts. */
  totalEarnings: number;
  /** Owed but not paid because budgets ran out. */
  totalShortfall: number;
  /** Owed but frozen while a Brand reviews a Spike. */
  pendingReview: number;
  submissionCount: number;
}
