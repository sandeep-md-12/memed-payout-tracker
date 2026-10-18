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
    server.close(() => {
      Promise.all([disconnectMongo(), disconnectRedis()])
        .then(() => process.exit(0))
        .catch((err: unknown) => {
          console.error('Error while shutting down:', err);
          process.exit(1);
        });
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Failed to start the API:', err);
  process.exit(1);
});
