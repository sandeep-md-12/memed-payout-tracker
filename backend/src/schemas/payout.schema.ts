import { z } from 'zod';
import type { PayoutReason } from '../utils/constants';
import type { SubmissionResponse } from './submission.schema';

export const updateViewsSchema = z.object({
  views: z
    .number('Views must be a number')
    .int('Views must be a whole number')
    .min(0, 'Views cannot be negative')
    .max(100_000_000_000),
});
export type UpdateViewsInput = z.output<typeof updateViewsSchema>;

export interface PayoutEntryResponse {
  id: string;
  submissionId: string;
  amount: number;
  viewsAt: number;
  reason: PayoutReason;
  createdAt: Date;
}

/** Result of a views update or a review decision: the Submission now, and what money moved. */
export interface PayoutResultResponse {
  submission: SubmissionResponse;
  /** Net change to this Submission's Payout (negative = Clawback). */
  payoutChange: number;
  campaign: { id: string; spent: number; remaining: number; isLive: boolean };
}
