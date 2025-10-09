import session from 'express-session';
import { env } from './env';

const isProduction = env.NODE_ENV === 'production';

export const sessionMiddleware = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
});
