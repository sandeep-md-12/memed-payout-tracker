import type { ClientSession, Types } from 'mongoose';
import { CampaignModel, type Campaign, type CampaignDocument } from '../models';

export type LiveCampaignRow = Omit<Campaign, 'brand'> & {
  _id: Types.ObjectId;
  brand: { _id: Types.ObjectId; name: string };
};

export const campaignRepository = {
  create(data: Pick<Campaign, 'brand' | 'name' | 'platform' | 'budget' | 'milestones'>): Promise<CampaignDocument> {
    return CampaignModel.create(data);
  },

  findById(id: string | Types.ObjectId, session?: ClientSession): Promise<CampaignDocument | null> {
    return CampaignModel.findById(id).session(session ?? null).exec();
  },

  findByBrand(brandId: string): Promise<CampaignDocument[]> {
    return CampaignModel.find({ brand: brandId }).sort({ createdAt: -1 }).exec();
  },

  /** Live Campaigns: Budget Remaining above zero. */
  findLive(): Promise<LiveCampaignRow[]> {
    return CampaignModel.find({ $expr: { $lt: ['$spent', '$budget'] } })
      .sort({ createdAt: -1 })
      .populate('brand', 'name')
      .lean<LiveCampaignRow[]>()
      .exec();
  },
};
