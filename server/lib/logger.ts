/* eslint-disable no-console */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`ℹ️  ${message}`, meta ?? '');
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`⚠️  ${message}`, meta ?? '');
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`🚨 ${message}`, meta ?? '');
  },
};
