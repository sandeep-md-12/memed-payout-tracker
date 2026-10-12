import { Router } from 'express';
import { isMongoConnected } from '../database/mongo';
import { Messages } from '../utils/constants';
import { sendSuccess } from '../utils/response';
import { authRouter } from './auth.router';
import { campaignRouter } from './campaign.router';
import { creatorRouter } from './creator.router';
import { submissionRouter } from './submission.router';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  sendSuccess(res, { database: isMongoConnected() ? 'connected' : 'disconnected', uptimeSeconds: Math.round(process.uptime()) }, Messages.HEALTH_OK);
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/campaigns', campaignRouter);
apiRouter.use('/submissions', submissionRouter);
apiRouter.use('/creators', creatorRouter);
