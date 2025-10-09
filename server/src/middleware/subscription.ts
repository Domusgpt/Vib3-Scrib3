import { Request, Response, NextFunction } from 'express';

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const subscription = req.subscription;
  if (!subscription) {
    return res.status(402).json({ message: 'An active subscription is required to access this resource.' });
  }

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    return next();
  }

  return res.status(402).json({ message: 'Your subscription is not active. Please update your billing details.' });
}
