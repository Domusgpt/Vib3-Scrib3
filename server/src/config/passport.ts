import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';

import { env } from './env';
import { ensureLicense, upsertUser, findUserById } from '../services/user.service';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await findUserById(id);
    done(null, user || null);
  } catch (error) {
    done(error);
  }
});

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.BASE_URL}/auth/google/callback`,
        scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUser({
            id: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatar: profile.photos?.[0]?.value,
            google: {
              id: profile.id,
              accessToken,
            },
          });
          await ensureLicense(user.id);
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL: `${env.BASE_URL}/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'photos', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertUser({
            id: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatar: profile.photos?.[0]?.value,
            facebook: {
              id: profile.id,
              accessToken,
            },
          });
          await ensureLicense(user.id);
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}

export default passport;
