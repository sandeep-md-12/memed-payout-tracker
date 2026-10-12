import mongoose, { type ClientSession } from 'mongoose';

export async function connectMongo(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`MongoDB connected (${mongoose.connection.name})`);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/**
 * Runs `work` in a MongoDB transaction: all its writes are saved together or not at all.
 *
 * If two transactions change the same document at once (e.g. two payouts on one Campaign),
 * MongoDB aborts one with a write conflict and the driver re-runs `work` from the start with
 * fresh data. So `work` must load everything it needs inside the callback and may run more than once.
 */
export async function withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
