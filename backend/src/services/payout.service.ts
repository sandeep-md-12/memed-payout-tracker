import type { ClientSession } from 'mongoose';
import { withTransaction } from '../database/mongo';
import type { CampaignDocument, PayoutEntryDocument, SubmissionDocument } from '../models';
import { campaignRepository } from '../repositories/campaign.repository';
import { payoutEntryRepository, type NewPayoutEntry } from '../repositories/payoutEntry.repository';
import { submissionRepository } from '../repositories/submission.repository';
import type { PayoutEntryResponse, PayoutResultResponse } from '../schemas/payout.schema';
import { ErrorCode, type PayoutReason } from '../utils/constants';
import { ForbiddenError, NotFoundError } from '../utils/exceptions';
import type { AuthUser } from '../utils/permissions';
import { campaignService } from './campaign.service';
import { allocateRefill, amountOwedFor, payoutChange } from './payout.calculator';
import { toSubmissionResponse } from './submission.service';

/**
 * Records every money movement of one transaction. `move` updates the Submission's Payout and
 * the Campaign's Budget Spent by the same amount and writes it down, so Budget Spent always
 * equals the sum of the Campaign's Payout Entries.
 */
export class PayoutLedger {
  readonly entries: NewPayoutEntry[] = [];

  constructor(readonly campaign: CampaignDocument) {}

  move(submission: SubmissionDocument, amount: number, reason: PayoutReason): void {
    if (amount === 0) return;
    submission.paid += amount;
    this.campaign.spent += amount;
    this.entries.push({
      submission: submission._id,
      campaign: this.campaign._id,
      creator: submission.creator,
      amount,
      viewsAt: submission.views,
      reason,
    });
  }
}

/** Everything a payout operation needs, loaded inside its transaction. */
export interface PayoutContext {
  session: ClientSession;
  submission: SubmissionDocument;
  campaign: CampaignDocument;
  ledger: PayoutLedger;
}

/**
 * Moves the Submission's Payout toward its Amount Owed: pays (capped by Budget Remaining)
 * or claws back. Returns the change.
 */
export function settle({ submission, campaign, ledger }: PayoutContext): number {
  const change = payoutChange({
    amountOwed: submission.amountOwed,
    paid: submission.paid,
    budgetRemaining: campaign.budget - campaign.spent,
  });
  if (change === 0) return 0;

  let reason: PayoutReason;
  if (change < 0) reason = 'clawback';
  else reason = submission.paid + change < submission.amountOwed ? 'budget_cap' : 'milestone';

  ledger.move(submission, change, reason);
  return change;
}

/**
 * Runs a payout operation in one transaction: loads the Submission and its Campaign, lets `apply`
 * change them, gives any money that came back to older Submissions with a Shortfall, then saves
 * everything together. Two operations on the same Campaign at once can't both succeed on stale
 * numbers: MongoDB aborts one and it re-runs (see withTransaction).
 */
export async function runPayout(
  submissionId: string,
  apply: (ctx: PayoutContext) => Promise<number> | number,
): Promise<PayoutResultResponse> {
  const { result } = await withTransaction(async (session) => {
    const submission = await submissionRepository.findById(submissionId, session);
    if (!submission) throw new NotFoundError(ErrorCode.SUBMISSION_NOT_FOUND, 'Submission not found');
    const campaign = await campaignRepository.findById(submission.campaign, session);
    if (!campaign) throw new NotFoundError(ErrorCode.CAMPAIGN_NOT_FOUND, 'Campaign not found');

    const ctx: PayoutContext = { session, submission, campaign, ledger: new PayoutLedger(campaign) };
    const change = await apply(ctx);
    await submission.save({ session });

    // Money came back to the budget: older Submissions that were short get it first.
    if (change < 0) {
      const waiting = await submissionRepository.findWithShortfall(campaign._id, session, submission._id);
      const grants = allocateRefill(
        campaign.budget - campaign.spent,
        waiting.map((other) => ({ other, shortfall: other.amountOwed - other.paid })),
      );
      for (const { item, amount } of grants) {
        ctx.ledger.move(item.other, amount, 'shortfall_refill');
        await item.other.save({ session });
      }
    }

    await campaign.save({ session });
    await payoutEntryRepository.insertMany(ctx.ledger.entries, session);

    const isLive = campaign.spent < campaign.budget;
    return {
      result: {
        submission: toSubmissionResponse(submission),
        payoutChange: change,
        campaign: { id: campaign.id, spent: campaign.spent, remaining: campaign.budget - campaign.spent, isLive },
      },
    };
  });

  return result;
}

function toPayoutEntryResponse(entry: PayoutEntryDocument): PayoutEntryResponse {
  return {
    id: entry.id,
    submissionId: entry.submission.toString(),
    amount: entry.amount,
    viewsAt: entry.viewsAt,
    reason: entry.reason,
    createdAt: entry.createdAt,
  };
}

export const payoutService = {
  /** Records a new View Count from the platform and settles the Payout. */
  updateViews(submissionId: string, views: number, now = new Date()): Promise<PayoutResultResponse> {
    return runPayout(submissionId, (ctx) => {
      const { submission, campaign } = ctx;
      submission.views = views;
      submission.viewsUpdatedAt = now;
      submission.amountOwed = amountOwedFor(views, campaign.milestones);
      return settle(ctx);
    });
  },

  async historyForSubmission(user: AuthUser, submissionId: string): Promise<PayoutEntryResponse[]> {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) throw new NotFoundError(ErrorCode.SUBMISSION_NOT_FOUND, 'Submission not found');
    if (user.role === 'creator') {
      if (!submission.creator.equals(user.id)) throw new ForbiddenError('This submission belongs to another creator');
    } else {
      await campaignService.getOwned(user.id, submission.campaign.toString());
    }
    const entries = await payoutEntryRepository.findBySubmission(submissionId);
    return entries.map(toPayoutEntryResponse);
  },

  async historyForCampaign(brandId: string, campaignId: string): Promise<PayoutEntryResponse[]> {
    await campaignService.getOwned(brandId, campaignId);
    const entries = await payoutEntryRepository.findByCampaign(campaignId);
    return entries.map(toPayoutEntryResponse);
  },
};
