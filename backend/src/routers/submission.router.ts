import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { requireAuth, requireRole } from '../utils/permissions';

export const submissionRouter = Router();

submissionRouter.get('/mine', requireAuth, requireRole('creator'), submissionController.listMine);
