import cors, { CorsOptions } from 'cors';
import { env } from './env';

const allowedOrigins = [
  env.BASE_URL.replace(/:\\d+$/, ':3000'),
  env.BASE_URL,
];

const options: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS.`));
  },
  credentials: true,
};

export const corsMiddleware = cors(options);
