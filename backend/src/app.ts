import cors from 'cors';
import express, { type Express } from 'express';
import { apiRouter } from './routers/api.router';
import { config } from './utils/config';
import { errorHandler, notFoundHandler } from './utils/errorHandler';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
