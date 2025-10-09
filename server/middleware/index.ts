import { NextFunction, Request, Response } from 'express';
import { billingService } from '../modules/billing/billing.service';
import { licenseService } from '../modules/licenses/license.service';

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'User not authenticated' });
};

export const hasActiveLicense = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = req.user.id;
  const [license, subscription] = await Promise.all([
    licenseService.getLicenseForUser(userId),
    billingService.getSubscriptionForUser(userId),
  ]);

  const isActive =
    (license && license.status === 'active') ||
    (subscription && (subscription.status === 'active' || subscription.status === 'trialing'));

  if (isActive) {
    return next();
  }

  return res.status(403).json({ message: 'An active license or subscription is required to use this feature.' });
};