import './shared/types';
import { createApp } from './app';
import { env } from './config/env';

const start = async () => {
  const app = await createApp();
  app.listen(env.PORT, () => {
    console.log(`Server is running on http://localhost:${env.PORT}`);
  });
};

start();
