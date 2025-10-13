import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).or(z.undefined()),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET is required').default('dev-secret-change-me'),
  BASE_URL: z.string().url().optional(),
  CLIENT_ORIGIN: z.string().url().optional(),
  API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  BILLING_PUBLISHABLE_KEY: z.string().optional(),
  BILLING_SECRET_KEY: z.string().optional(),
  BILLING_WEBHOOK_SECRET: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  PAGERDUTY_ROUTING_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables. Please check your .env file.');
}

export const env = {
  ...parsed.data,
  PORT: parsed.data.PORT ?? 3001,
};

export type Env = typeof env;
