import type { Express } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { db, initDb } from '../infrastructure/db';
import { env } from './env';
import type { User, UserIntegration } from '../shared/types';

void initDb();

const defaultIntegrations: UserIntegration[] = [
  { id: 'google' },
  { id: 'facebook' },
  { id: 'slack' },
  { id: 'notion' },
  { id: 'zapier' },
  { id: 'webhook' },
];

passport.serializeUser<string>((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser<string>((id, done) => {
  const user = db.data.users.find((u) => u.id === id) || null;
  done(null, (user ?? false) as Express.User | false);
});

const ensureIntegrations = (user: User) => {
  user.integrations ||= defaultIntegrations.map((integration) => ({ ...integration }));
  for (const integration of defaultIntegrations) {
    if (!user.integrations?.some((item) => item.id === integration.id)) {
      user.integrations?.push({ ...integration });
    }
  }
};

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.BASE_URL}/auth/google/callback`,
      },
      async (accessToken, _refreshToken, profile, done) => {
        await initDb();
        const existingUser = db.data.users.find((u) => u.google?.id === profile.id);
        if (existingUser) {
          existingUser.google = { id: profile.id, accessToken };
          existingUser.name ||= profile.displayName;
          existingUser.email ||= profile.emails?.[0]?.value;
          ensureIntegrations(existingUser);
          await db.write();
          return done(null, existingUser);
        }

        const newUser: User = {
          id: `user_${Date.now()}`,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          google: { id: profile.id, accessToken },
          integrations: defaultIntegrations.map((integration) => ({ ...integration })),
        };
        await initDb();
        db.data.users.push(newUser);
        await db.write();
        return done(null, newUser);
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
        profileFields: ['id', 'displayName', 'emails', 'photos'],
      },
      async (accessToken, _refreshToken, profile, done) => {
        await initDb();
        const existingUser = db.data.users.find((u) => u.facebook?.id === profile.id);
        if (existingUser) {
          existingUser.facebook = { id: profile.id, accessToken };
          ensureIntegrations(existingUser);
          await db.write();
          return done(null, existingUser);
        }

        const email = profile.emails?.[0]?.value;
        const byEmail = email ? db.data.users.find((u) => u.email === email) : undefined;
        if (byEmail) {
          byEmail.facebook = { id: profile.id, accessToken };
          ensureIntegrations(byEmail);
          await db.write();
          return done(null, byEmail);
        }

        const newUser: User = {
          id: `user_${Date.now()}`,
          email,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          facebook: { id: profile.id, accessToken },
          integrations: defaultIntegrations.map((integration) => ({ ...integration })),
        };
        db.data.users.push(newUser);
        await db.write();
        return done(null, newUser);
      }
    )
  );
}

export default passport;
