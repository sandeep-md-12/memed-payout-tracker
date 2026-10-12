import type { PayoutResultResponse } from '../schemas/payout.schema';
import { ErrorCode } from '../utils/constants';
import { ConflictError, ForbiddenError } from '../utils/exceptions';
import { runPayout, settle, type PayoutContext } from './payout.service';

/** Only the Campaign's own Brand may review, and only a Flagged Submission. */
function assertReviewable({ submission, campaign }: PayoutContext, brandId: string): void {
  if (!campaign.brand.equals(brandId)) throw new ForbiddenError('This submission belongs to another brand');
  if (submission.status !== 'flagged') {
    throw new ConflictError(ErrorCode.SUBMISSION_NOT_FLAGGED, 'Only flagged submissions can be reviewed');
  }
}

export const reviewService = {
  /** Clears the flag and lets the Payout catch up to the current View Count in one step. */
  approve(brandId: string, submissionId: string): Promise<PayoutResultResponse> {
    return runPayout(submissionId, (ctx) => {
      assertReviewable(ctx, brandId);
      ctx.submission.status = 'active';
      ctx.submission.flag = null;
      return settle(ctx, true);
    });
  },

  /**
   * Cancels the Submission for good: its whole Payout returns to the Campaign (and from there to
   * older Submissions with a Shortfall) and it never earns again. The flag is kept as the reason.
   */
  reject(brandId: string, submissionId: string): Promise<PayoutResultResponse> {
    return runPayout(submissionId, (ctx) => {
      assertReviewable(ctx, brandId);
      ctx.submission.status = 'rejected';
      ctx.submission.amountOwed = 0;
      const change = -ctx.submission.paid;
      ctx.ledger.move(ctx.submission, change, 'review_rejected');
      return change;
    });
  },
};
