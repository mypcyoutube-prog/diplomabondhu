import mongoose from 'mongoose';
import { loadEnv } from './config/env';
import { createApp } from './app';
import { logger, setLogLevel } from './core/logger';
import { processDueAnnouncements } from './modules/notifications/notifications.service';

async function main() {
  const env = loadEnv();
  setLogLevel(env.LOG_LEVEL === 'debug' ? 'debug' : env.LOG_LEVEL);
  await mongoose.connect(env.MONGODB_URI);
  await mongoose.syncIndexes();
  logger.info('Connected to MongoDB (indexes synced)');
  const app = createApp(env);
  app.listen(env.PORT, () => logger.info(`DiplomaBondhu API listening on port ${env.PORT}`));

  const scheduler = setInterval(() => {
    processDueAnnouncements().catch((err) =>
      logger.warn('Scheduled announcement processing failed', { message: err instanceof Error ? err.message : String(err) })
    );
  }, 60 * 1000);
  scheduler.unref();
}

main().catch((err) => {
  logger.error('Fatal startup error', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
