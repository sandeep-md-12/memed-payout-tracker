import { Router } from 'express';
import { isMongoConnected } from '../database/mongo';
import { Messages } from '../utils/constants';
import { sendSuccess } from '../utils/response';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  sendSuccess(res, { database: isMongoConnected() ? 'connected' : 'disconnected', uptimeSeconds: Math.round(process.uptime()) }, Messages.HEALTH_OK);
});
