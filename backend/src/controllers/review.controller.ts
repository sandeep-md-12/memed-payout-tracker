import type { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { Messages } from '../utils/constants';
import { currentUser } from '../utils/permissions';
import { sendSuccess } from '../utils/response';

type IdParams = { id: string };

export const reviewController = {
  /** POST /api/submissions/:id/approve */
  async approve(req: Request<IdParams>, res: Response): Promise<void> {
    const result = await reviewService.approve(currentUser(req).id, req.params.id);
    sendSuccess(res, result, Messages.SUBMISSION_APPROVED);
  },

  /** POST /api/submissions/:id/reject */
  async reject(req: Request<IdParams>, res: Response): Promise<void> {
    const result = await reviewService.reject(currentUser(req).id, req.params.id);
    sendSuccess(res, result, Messages.SUBMISSION_REJECTED);
  },
};
