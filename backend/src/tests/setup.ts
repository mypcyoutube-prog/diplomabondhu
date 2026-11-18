import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Env } from '../config/env';

let mongo: MongoMemoryServer;

export const testEnv: Env = {
  NODE_ENV: 'test',
  PORT: 5000,
  MONGODB_URI: 'mongodb://localhost:27017/test',
  JWT_ACCESS_SECRET: 'test-access-secret-value-at-least-32-chars-long!!',
  JWT_REFRESH_SECRET: 'test-refresh-secret-value-at-least-32-chars-long!!',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
  CORS_ORIGINS: '',
  LOG_LEVEL: 'error',
  RESULT_SERVICE_URL: '',
  RESULT_SERVICE_TOKEN: '',
  RESULTS_DB: 'results_db'
};

export async function startMongo(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

export async function clearDb(): Promise<void> {
  const collections = (await mongoose.connection.db?.collections()) ?? [];
  for (const c of collections) await c.deleteMany({});
}
