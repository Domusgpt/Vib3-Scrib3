import { Request, Response, NextFunction } from 'express';

export function requireAuthentication(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Authentication required' });
}
