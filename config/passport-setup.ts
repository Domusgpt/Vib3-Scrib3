import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import dotenv from 'dotenv';
import { db } from '../db';
import { User } from '../../types';

dotenv.config();

passport.serializeUser((user, done) => {
    done(null, (user as any).id);
});

passport.deserializeUser((id, done) => {
    const user = db.data.users.find(u => u.id === id);
    done(null, user);
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    const existingUser = db.data.users.find(u => u.google?.id === profile.id);
    if (existingUser) {
        // Update tokens if necessary
        existingUser.google.accessToken = accessToken;
        await db.write();
        return done(null, existingUser);
    }

    const newUser: User = {
        id: `user_${Date.now()}`,
        email: profile.emails?.[0].value,
        name: profile.displayName,
        avatar: profile.photos?.[0].value,
        google: {
            id: profile.id,
            accessToken: accessToken,
        }
    };
    db.data.users.push(newUser);
    await db.write();
    done(null, newUser);
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID!,
    clientSecret: process.env.FACEBOOK_APP_SECRET!,
    callbackURL: `${process.env.BASE_URL}/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails', 'photos']
}, async (accessToken, refreshToken, profile, done) => {
    const existingUser = db.data.users.find(u => u.facebook?.id === profile.id);
    if (existingUser) {
        existingUser.facebook.accessToken = accessToken;
        await db.write();
        return done(null, existingUser);
    }
    
    // Check if user exists with the same email from another provider
    const email = profile.emails?.[0].value;
    const userByEmail = db.data.users.find(u => u.email === email);
    if (userByEmail) {
        userByEmail.facebook = { id: profile.id, accessToken };
        await db.write();
        return done(null, userByEmail);
    }

    const newUser: User = {
        id: `user_${Date.now()}`,
        email: email,
        name: profile.displayName,
        avatar: profile.photos?.[0].value,
        facebook: {
            id: profile.id,
            accessToken: accessToken,
        }
    };
    db.data.users.push(newUser);
    await db.write();
    done(null, newUser);
}));
