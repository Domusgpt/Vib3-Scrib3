import { Router } from 'express';
import { z } from 'zod';

import { requireAuthentication } from '../middleware/authenticated';
import { attachTenantContext } from '../middleware/tenant';
import { getPlanCatalog, updateSubscriptionPlan, getPlanById } from '../services/billing.service';

const router = Router();

const checkoutSchema = z.object({
  planId: z.string(),
  billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
});

router.get('/plans', (_req, res) => {
  res.json({ plans: getPlanCatalog() });
});

router.post('/checkout', requireAuthentication, attachTenantContext, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const plan = getPlanById(parsed.data.planId);
  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const fakeCheckoutUrl = `https://billing.scribe.ai/checkout?tenant=${req.tenant!.id}&plan=${plan.slug}&interval=${parsed.data.billingInterval}`;

  res.json({ checkoutUrl: fakeCheckoutUrl });
});

router.post('/activate', requireAuthentication, attachTenantContext, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const plan = getPlanById(parsed.data.planId);
  if (!plan) {
    return res.status(404).json({ message: 'Plan not found' });
  }

  const subscription = await updateSubscriptionPlan(req.tenant!.id, plan.id, 'active');

  res.json({ subscription });
});

export default router;
