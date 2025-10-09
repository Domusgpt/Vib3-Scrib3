import { Router } from 'express';

import passport from '../config/passport';
import { env } from '../config/env';
import { ensureLicense } from '../services/user.service';
import { ensureTenantForUser } from '../services/tenant.service';
import { ensureTrialSubscription, getSubscriptionForTenant } from '../services/billing.service';

const router = Router();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (_req, res) => {
      res.redirect('/');
    }
  );
} else {
  router.get('/google', (_req, res) => res.status(501).json({ message: 'Google OAuth not configured' }));
  router.get('/google/callback', (_req, res) => res.status(501).json({ message: 'Google OAuth not configured' }));
}

if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
  router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    (_req, res) => {
      res.redirect('/');
    }
  );
} else {
  router.get('/facebook', (_req, res) => res.status(501).json({ message: 'Facebook OAuth not configured' }));
  router.get('/facebook/callback', (_req, res) => res.status(501).json({ message: 'Facebook OAuth not configured' }));
}

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session?.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });
});

router.get('/user', async (req, res) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ isAuthenticated: false, user: null, license: null });
  }

  const tenant = await ensureTenantForUser(req.user);
  const subscription = (await getSubscriptionForTenant(tenant.id)) || (await ensureTrialSubscription(tenant));
  const license = await ensureLicense(req.user.id);

  res.json({
    isAuthenticated: true,
    user: req.user,
    license,
    tenant,
    subscription,
    baseUrl: env.BASE_URL,
  });
});

export default router;
