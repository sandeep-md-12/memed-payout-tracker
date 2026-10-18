import { Types } from 'mongoose';
import type { Submission } from '../models';
import { campaignRepository } from '../repositories/campaign.repository';
import { submissionRepository } from '../repositories/submission.repository';
import type { CreateSubmissionInput, EarningsResponse, SubmissionResponse } from '../schemas/submission.schema';
import { ErrorCode } from '../utils/constants';
import { ConflictError, NotFoundError } from '../utils/exceptions';
import { normalizePostUrl } from '../utils/url';
import { campaignService } from './campaign.service';

type SubmissionFields = Pick<
  Submission,
  'postUrl' | 'views' | 'amountOwed' | 'paid' | 'status' | 'flag' | 'viewsUpdatedAt' | 'createdAt'
> & { _id: Types.ObjectId };

export function toSubmissionResponse(
  submission: SubmissionFields,
  related: Pick<SubmissionResponse, 'campaign' | 'creator'> = {},
): SubmissionResponse {
  const unpaid = Math.max(submission.amountOwed - submission.paid, 0);
  return {
    id: submission._id.toString(),
    postUrl: submission.postUrl,
    views: submission.views,
    amountOwed: submission.amountOwed,
    paid: submission.paid,
    shortfall: submission.status === 'active' ? unpaid : 0,
    status: submission.status,
    flag: submission.flag ?? null,
    viewsUpdatedAt: submission.viewsUpdatedAt,
    createdAt: submission.createdAt,
    ...related,
  };
}

export const submissionService = {
  async submit(creatorId: string, campaignId: string, input: CreateSubmissionInput): Promise<SubmissionResponse> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundError(ErrorCode.CAMPAIGN_NOT_FOUND, 'Campaign not found');
    if (campaign.spent >= campaign.budget) {
      throw new ConflictError(ErrorCode.CAMPAIGN_NOT_LIVE, 'This campaign has spent its whole budget and is not accepting new submissions');
    }

    const postUrl = normalizePostUrl(input.postUrl, campaign.platform);
    if (await submissionRepository.existsByPostUrl(postUrl)) {
      throw new ConflictError(ErrorCode.POST_ALREADY_SUBMITTED, 'This post has already been submitted to a campaign');
    }

    const submission = await submissionRepository.create({
      campaign: campaign._id,
      creator: new Types.ObjectId(creatorId),
      postUrl,
    });
    return toSubmissionResponse(submission, {
      campaign: { id: campaign.id, name: campaign.name, platform: campaign.platform },
    });
  },

  async listForCreator(creatorId: string): Promise<SubmissionResponse[]> {
    const rows = await submissionRepository.findByCreator(creatorId);
    return rows.map((row) =>
      toSubmissionResponse(row, {
        campaign: { id: row.campaign._id.toString(), name: row.campaign.name, platform: row.campaign.platform },
      }),
    );
  },

  async listForCampaign(brandId: string, campaignId: string): Promise<SubmissionResponse[]> {
    await campaignService.getOwned(brandId, campaignId);
    const rows = await submissionRepository.findByCampaign(campaignId);
    return rows.map((row) =>
      toSubmissionResponse(row, { creator: { id: row.creator._id.toString(), name: row.creator.name } }),
    );
  },

  async earnings(creatorId: string): Promise<EarningsResponse> {
    const totals = await submissionRepository.totalsByStatusForCreator(creatorId);
    const byStatus = (status: string) => totals.find((t) => t._id === status);
    return {
      totalEarnings: totals.reduce((sum, t) => sum + t.paid, 0),
      totalShortfall: byStatus('active')?.unpaid ?? 0,
      pendingReview: byStatus('flagged')?.unpaid ?? 0,
      submissionCount: totals.reduce((sum, t) => sum + t.count, 0),
    };
  },
};
