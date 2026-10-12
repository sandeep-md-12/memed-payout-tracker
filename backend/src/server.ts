import { createApp } from './app';
import { connectMongo, disconnectMongo } from './database/mongo';
import { connectRedis, disconnectRedis } from './database/redis';
import { config } from './utils/config';

async function main(): Promise<void> {
  await connectMongo(config.MONGODB_URI);
  connectRedis(config.REDIS_URL);

  const server = createApp().listen(config.PORT, () => {
    console.log(`API listening on http://localhost:${config.PORT}/api (${config.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await Promise.all([disconnectMongo(), disconnectRedis()]);
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Failed to start the API:', err);
  process.exit(1);
});
