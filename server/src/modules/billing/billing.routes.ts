import { Request, Response, Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  getPlans,
  getSubscriptionForUser,
  getUsageForUser,
  isUsageWithinAllowance,
  upsertSubscription,
} from './billing.service';
import type { SubscriptionTier, User } from '../../shared/types';

const router = Router();

router.use(requireAuth);

router.get('/plans', async (_req: Request, res: Response) => {
  const plans = await getPlans();
  res.json(plans);
});

router.get('/subscription', async (req: Request, res: Response) => {
  const user = req.user as User;
  const subscription = await getSubscriptionForUser(user.id);
  res.json({ subscription });
});

router.post('/subscription', async (req: Request, res: Response) => {
  const { planId } = req.body as { planId?: SubscriptionTier };
  if (!planId) {
    return res.status(400).json({ message: 'planId is required.' });
  }
  const subscription = await upsertSubscription(req.user as User, planId, 'active');
  res.json({ subscription });
});

router.get('/usage', async (req: Request, res: Response) => {
  const user = req.user as User;
  const usage = await getUsageForUser(user.id);
  const subscription = await getSubscriptionForUser(user.id);
  const withinAllowance = subscription ? await isUsageWithinAllowance(subscription, usage) : true;
  res.json({ usage, subscription, withinAllowance });
});

export default router;
