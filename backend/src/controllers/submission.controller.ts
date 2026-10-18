import type { Request, Response } from 'express';
import type { CreateSubmissionInput } from '../schemas/submission.schema';
import { submissionService } from '../services/submission.service';
import { Messages } from '../utils/constants';
import { currentUser } from '../utils/permissions';
import { sendSuccess } from '../utils/response';

type IdParams = { id: string };

export const submissionController = {
  /** POST /api/campaigns/:id/submissions */
  async create(req: Request<IdParams, unknown, CreateSubmissionInput>, res: Response): Promise<void> {
    const submission = await submissionService.submit(currentUser(req).id, req.params.id, req.body);
    sendSuccess(res, submission, Messages.SUBMISSION_CREATED, 201);
  },

  /** GET /api/campaigns/:id/submissions */
  async listForCampaign(req: Request<IdParams>, res: Response): Promise<void> {
    const submissions = await submissionService.listForCampaign(currentUser(req).id, req.params.id);
    sendSuccess(res, submissions, Messages.SUBMISSIONS_RETRIEVED);
  },

  /** GET /api/submissions/mine */
  async listMine(req: Request, res: Response): Promise<void> {
    const submissions = await submissionService.listForCreator(currentUser(req).id);
    sendSuccess(res, submissions, Messages.SUBMISSIONS_RETRIEVED);
  },

  /** GET /api/creators/me/earnings */
  async earnings(req: Request, res: Response): Promise<void> {
    const earnings = await submissionService.earnings(currentUser(req).id);
    sendSuccess(res, earnings, Messages.EARNINGS_RETRIEVED);
  },
};
