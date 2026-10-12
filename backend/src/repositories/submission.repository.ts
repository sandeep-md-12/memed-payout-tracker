import { Types, type ClientSession } from 'mongoose';
import { SubmissionModel, type Submission, type SubmissionDocument } from '../models';
import type { Platform, SubmissionStatus } from '../utils/constants';

export type CreatorSubmissionRow = Omit<Submission, 'campaign'> & {
  _id: Types.ObjectId;
  campaign: { _id: Types.ObjectId; name: string; platform: Platform };
};

export type CampaignSubmissionRow = Omit<Submission, 'creator'> & {
  _id: Types.ObjectId;
  creator: { _id: Types.ObjectId; name: string };
};

export interface StatusTotals {
  _id: SubmissionStatus;
  paid: number;
  /** Sum of max(amountOwed - paid, 0). */
  unpaid: number;
  count: number;
}

export const submissionRepository = {
  create(data: Pick<Submission, 'campaign' | 'creator' | 'postUrl'>): Promise<SubmissionDocument> {
    return SubmissionModel.create(data);
  },

  findById(id: string, session?: ClientSession): Promise<SubmissionDocument | null> {
    return SubmissionModel.findById(id).session(session ?? null).exec();
  },

  existsByPostUrl(postUrl: string): Promise<boolean> {
    return SubmissionModel.exists({ postUrl }).then(Boolean);
  },

  findByCreator(creatorId: string): Promise<CreatorSubmissionRow[]> {
    return SubmissionModel.find({ creator: creatorId })
      .sort({ createdAt: -1 })
      .populate('campaign', 'name platform')
      .lean<CreatorSubmissionRow[]>()
      .exec();
  },

  findByCampaign(campaignId: string): Promise<CampaignSubmissionRow[]> {
    return SubmissionModel.find({ campaign: campaignId })
      .sort({ createdAt: 1 })
      .populate('creator', 'name')
      .lean<CampaignSubmissionRow[]>()
      .exec();
  },

  totalsByStatusForCreator(creatorId: string): Promise<StatusTotals[]> {
    return SubmissionModel.aggregate<StatusTotals>([
      { $match: { creator: new Types.ObjectId(creatorId) } },
      {
        $group: {
          _id: '$status',
          paid: { $sum: '$paid' },
          unpaid: { $sum: { $max: [{ $subtract: ['$amountOwed', '$paid'] }, 0] } },
          count: { $sum: 1 },
        },
      },
    ]).exec();
  },
};
