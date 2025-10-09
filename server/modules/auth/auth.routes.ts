import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { billingService } from '../billing/billing.service';
import { licenseService } from '../licenses/license.service';
import { organizationService } from '../organizations/organization.service';
import { db } from '../../database/client';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email', 'https://www.googleapis.com/auth/gmail.readonly'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (_req: Request, res: Response) => {
  res.redirect('/');
});

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/' }), (_req: Request, res: Response) => {
  res.redirect('/');
});

router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out' });
    });
  });
});

router.get('/user', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ isAuthenticated: false, user: null, license: null, subscription: null, usage: null });
  }

  await organizationService.ensurePersonalWorkspace(req.user);
  const organizations = await organizationService.listSummariesForUser(req.user.id);
  const activeOrganizationId = req.session?.activeOrganizationId ?? organizations[0]?.organization.id ?? null;
  if (req.session) {
    req.session.activeOrganizationId = activeOrganizationId ?? undefined;
  }

  await db.read();
  const invitations = db.data?.invitations.filter(
    invitation =>
      invitation.status === 'pending' &&
      invitation.email && req.user?.email && invitation.email.toLowerCase() === req.user.email.toLowerCase(),
  ) ?? [];

  const [license, usage] = await Promise.all([
    licenseService.getLicenseForUser(req.user.id, activeOrganizationId ?? undefined),
    billingService.getUsageSnapshot(req.user.id, activeOrganizationId ?? undefined),
  ]);

  const activeSummary = organizations.find(summary => summary.organization.id === activeOrganizationId);
  const subscription = activeSummary?.subscription ?? null;

  res.json({
    isAuthenticated: true,
    user: req.user,
    license,
    subscription,
    usage,
    organizations,
    activeOrganizationId,
    invitations,
  });
});

export default router;
