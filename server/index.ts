import { createApp } from './app';
import { env } from './config/env';
import { initDatabase } from './database/client';
import { seedDatabase } from './database/seed';
import { logger } from './lib/logger';

const bootstrap = async () => {
  await initDatabase();
  await seedDatabase();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Server is running on http://localhost:${env.PORT}`);
  });
};

bootstrap().catch(error => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
