import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  BASE_URL: z.string().url().default('http://localhost:3001'),
  SESSION_SECRET: z.string().min(10, 'SESSION_SECRET must be at least 10 characters long'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

const rawEnv = envSchema.safeParse(process.env);

if (!rawEnv.success) {
  console.error('Invalid environment configuration:', rawEnv.error.flatten().fieldErrors);
  throw new Error('Failed to parse environment variables.');
}

export const env = rawEnv.data;
export const isProduction = env.NODE_ENV === 'production';
