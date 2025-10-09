import { db } from '../db';

// FIX: Removed explicit types from middleware arguments to prevent type errors.
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
};

// FIX: Removed explicit types from middleware arguments to prevent type errors.
export const hasActiveLicense = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const userId = (req.user as any).id;
  const license = db.data.licenses.find(l => l.userId === userId);

  if (license && license.status === 'active') {
    return next();
  }

  res.status(403).json({ message: 'An active license is required to use this feature.' });
};