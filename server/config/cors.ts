import cors, { CorsOptions } from 'cors';
import { env } from './env';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  env.CLIENT_ORIGIN,
  env.BASE_URL,
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

export const corsMiddleware = cors(corsOptions);
