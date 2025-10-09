import { NextFunction, Request, Response } from 'express';
import { db, initDb } from '../infrastructure/db';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication required.' });
};

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  await initDb();
  const subscription = db.data.subscriptions.find((sub) => sub.userId === req.user!.id && sub.status === 'active');

  if (subscription) {
    return next();
  }

  return res.status(402).json({
    message: 'An active subscription is required to access this feature.',
  });
};
