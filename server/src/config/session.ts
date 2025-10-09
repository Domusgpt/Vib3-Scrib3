import session from 'express-session';
import { env, isProduction } from './env';

export const sessionMiddleware = session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProduction ? 'lax' : 'strict',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
});
