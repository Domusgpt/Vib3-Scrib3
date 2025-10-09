import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { env } from './env';
import { userService } from '../modules/users/user.service';
import { logger } from '../lib/logger';

const getCallbackUrl = (path: string) => {
  if (env.BASE_URL) {
    return `${env.BASE_URL}${path}`;
  }
  return `http://localhost:${env.PORT}${path}`;
};

export const configurePassport = () => {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await userService.findById(id);
      done(null, user ?? null);
    } catch (error) {
      done(error as Error);
    }
  });

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: getCallbackUrl('/auth/google/callback'),
          scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await userService.upsertFromOAuth('google', profile, { accessToken, refreshToken: refreshToken ?? undefined });
            done(null, user);
          } catch (error) {
            logger.error('Google OAuth failed', { error });
            done(error as Error);
          }
        },
      ),
    );
  } else {
    logger.warn('Google OAuth disabled. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
  }

  if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: env.FACEBOOK_APP_ID,
          clientSecret: env.FACEBOOK_APP_SECRET,
          callbackURL: getCallbackUrl('/auth/facebook/callback'),
          profileFields: ['id', 'displayName', 'emails', 'photos'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await userService.upsertFromOAuth('facebook', profile, { accessToken, refreshToken: refreshToken ?? undefined });
            done(null, user);
          } catch (error) {
            logger.error('Facebook OAuth failed', { error });
            done(error as Error);
          }
        },
      ),
    );
  } else {
    logger.warn('Facebook OAuth disabled. Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET.');
  }
};
