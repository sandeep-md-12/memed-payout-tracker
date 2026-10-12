import type { Request, Response } from 'express';
import type { UpdateViewsInput } from '../schemas/payout.schema';
import { payoutService } from '../services/payout.service';
import { Messages } from '../utils/constants';
import { currentUser } from '../utils/permissions';
import { sendSuccess } from '../utils/response';

type IdParams = { id: string };

export const payoutController = {
  /** PATCH /api/submissions/:id/views (simulated platform data, no login) */
  async updateViews(req: Request<IdParams>, res: Response): Promise<void> {
    const { views } = req.body as UpdateViewsInput;
    const result = await payoutService.updateViews(req.params.id, views);
    sendSuccess(res, result, Messages.VIEWS_UPDATED);
  },

  /** GET /api/submissions/:id/payouts */
  async historyForSubmission(req: Request<IdParams>, res: Response): Promise<void> {
    const entries = await payoutService.historyForSubmission(currentUser(req), req.params.id);
    sendSuccess(res, entries, Messages.PAYOUTS_RETRIEVED);
  },

  /** GET /api/campaigns/:id/payouts */
  async historyForCampaign(req: Request<IdParams>, res: Response): Promise<void> {
    const entries = await payoutService.historyForCampaign(currentUser(req).id, req.params.id);
    sendSuccess(res, entries, Messages.PAYOUTS_RETRIEVED);
  },
};
