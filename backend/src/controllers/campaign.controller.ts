import type { Request, Response } from 'express';
import type { CreateCampaignInput } from '../schemas/campaign.schema';
import { campaignService } from '../services/campaign.service';
import { Messages } from '../utils/constants';
import { currentUser } from '../utils/permissions';
import { sendSuccess } from '../utils/response';

export const campaignController = {
  async create(req: Request, res: Response): Promise<void> {
    const campaign = await campaignService.create(currentUser(req).id, req.body as CreateCampaignInput);
    sendSuccess(res, campaign, Messages.CAMPAIGN_CREATED, 201);
  },

  async listMine(req: Request, res: Response): Promise<void> {
    const campaigns = await campaignService.listForBrand(currentUser(req).id);
    sendSuccess(res, campaigns, Messages.CAMPAIGNS_RETRIEVED);
  },

  async listLive(_req: Request, res: Response): Promise<void> {
    const campaigns = await campaignService.listLive();
    sendSuccess(res, campaigns, Messages.CAMPAIGNS_RETRIEVED);
  },
};
