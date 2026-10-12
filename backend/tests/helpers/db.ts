import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import '../../src/models';

let replSet: MongoMemoryReplSet | undefined;

/** Starts a one-node in-memory replica set: transactions need a replica set, even in tests. */
export async function startTestDb(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri());
  // Build unique indexes now, so duplicate-key behaviour is tested against real indexes.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
}

export async function clearTestDb(): Promise<void> {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  await replSet?.stop();
}
