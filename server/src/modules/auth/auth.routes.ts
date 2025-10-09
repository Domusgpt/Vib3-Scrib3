import { NextFunction, Request, Response, Router } from 'express';
import passport from '../../config/passport';
import { buildAuthState, ensureSubscription } from './auth.service';
import { env } from '../../config/env';
import type { User } from '../../shared/types';

const router = Router();

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: true })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/?auth=failed', session: true }),
  async (req: Request, res: Response) => {
    if (req.user) {
      await ensureSubscription(req.user as User);
    }
    res.redirect(`${env.BASE_URL}`);
  }
);

router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: true })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/?auth=failed', session: true }),
  async (req: Request, res: Response) => {
    if (req.user) {
      await ensureSubscription(req.user as User);
    }
    res.redirect(`${env.BASE_URL}`);
  }
);

router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err?: Error) => {
    if (err) {
      return next(err);
    }
    req.session?.destroy(() => {
      res.json({ message: 'Logged out successfully.' });
    });
  });
});

router.get('/user', async (req: Request, res: Response) => {
  const authState = await buildAuthState(req.user as User | undefined);
  res.json(authState);
});

export default router;
