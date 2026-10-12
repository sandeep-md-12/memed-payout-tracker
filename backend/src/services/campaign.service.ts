import { Types } from 'mongoose';
import type { Campaign, CampaignDocument } from '../models';
import { campaignRepository } from '../repositories/campaign.repository';
import type { CampaignResponse, CreateCampaignInput } from '../schemas/campaign.schema';
import { ErrorCode } from '../utils/constants';
import { ForbiddenError, NotFoundError } from '../utils/exceptions';

type CampaignFields = Pick<Campaign, 'name' | 'platform' | 'budget' | 'spent' | 'milestones' | 'createdAt'> & {
  _id: Types.ObjectId;
};

export function toCampaignResponse(campaign: CampaignFields, brandName?: string): CampaignResponse {
  const remaining = campaign.budget - campaign.spent;
  return {
    id: campaign._id.toString(),
    name: campaign.name,
    platform: campaign.platform,
    budget: campaign.budget,
    spent: campaign.spent,
    remaining,
    isLive: remaining > 0,
    milestones: campaign.milestones.map(({ views, amount }) => ({ views, amount })),
    ...(brandName !== undefined && { brandName }),
    createdAt: campaign.createdAt,
  };
}

export const campaignService = {
  async create(brandId: string, input: CreateCampaignInput): Promise<CampaignResponse> {
    const campaign = await campaignRepository.create({ brand: new Types.ObjectId(brandId), ...input });
    return toCampaignResponse(campaign);
  },

  async listForBrand(brandId: string): Promise<CampaignResponse[]> {
    const campaigns = await campaignRepository.findByBrand(brandId);
    return campaigns.map((campaign) => toCampaignResponse(campaign));
  },

  async listLive(): Promise<CampaignResponse[]> {
    const campaigns = await campaignRepository.findLive();
    return campaigns.map((campaign) => toCampaignResponse(campaign, campaign.brand.name));
  },

  /** Loads a Campaign and checks it belongs to the Brand asking for it. */
  async getOwned(brandId: string, campaignId: string): Promise<CampaignDocument> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) throw new NotFoundError(ErrorCode.CAMPAIGN_NOT_FOUND, 'Campaign not found');
    if (!campaign.brand.equals(brandId)) throw new ForbiddenError('This campaign belongs to another brand');
    return campaign;
  },
};
