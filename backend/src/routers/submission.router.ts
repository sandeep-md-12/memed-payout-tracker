import { Router } from 'express';
import { payoutController } from '../controllers/payout.controller';
import { submissionController } from '../controllers/submission.controller';
import { idParamsSchema } from '../schemas/common.schema';
import { updateViewsSchema } from '../schemas/payout.schema';
import { requireAuth, requireRole } from '../utils/permissions';
import { validateBody, validateParams } from '../utils/validate';

export const submissionRouter = Router();

// Simulates the platform reporting a new View Count. The brief asks for no login here;
// in production this would be a signed webhook or an internal job, not a public endpoint.
submissionRouter.patch(
  '/:id/views',
  validateParams(idParamsSchema),
  validateBody(updateViewsSchema),
  payoutController.updateViews,
);

submissionRouter.get('/mine', requireAuth, requireRole('creator'), submissionController.listMine);

// Creator who owns the Submission, or Brand who owns its Campaign (checked in the service).
submissionRouter.get('/:id/payouts', requireAuth, validateParams(idParamsSchema), payoutController.historyForSubmission);
