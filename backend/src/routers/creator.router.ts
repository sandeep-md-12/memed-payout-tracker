import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { requireAuth, requireRole } from '../utils/permissions';

export const creatorRouter = Router();

creatorRouter.get('/me/earnings', requireAuth, requireRole('creator'), submissionController.earnings);
