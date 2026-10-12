import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { payoutController } from '../controllers/payout.controller';
import { submissionController } from '../controllers/submission.controller';
import { createCampaignSchema } from '../schemas/campaign.schema';
import { idParamsSchema } from '../schemas/common.schema';
import { createSubmissionSchema } from '../schemas/submission.schema';
import { requireAuth, requireRole } from '../utils/permissions';
import { validateBody, validateParams } from '../utils/validate';

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

// Brand
campaignRouter.post('/', requireRole('brand'), validateBody(createCampaignSchema), campaignController.create);
campaignRouter.get('/mine', requireRole('brand'), campaignController.listMine);
campaignRouter.get(
  '/:id/submissions',
  requireRole('brand'),
  validateParams(idParamsSchema),
  submissionController.listForCampaign,
);
campaignRouter.get('/:id/payouts', requireRole('brand'), validateParams(idParamsSchema), payoutController.historyForCampaign);

// Creator
campaignRouter.get('/', requireRole('creator'), campaignController.listLive);
campaignRouter.post(
  '/:id/submissions',
  requireRole('creator'),
  validateParams(idParamsSchema),
  validateBody(createSubmissionSchema),
  submissionController.create,
);
