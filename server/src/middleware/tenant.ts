import { Request, Response, NextFunction } from 'express';

import { ensureTenantForUser } from '../services/tenant.service';
import { ensureTrialSubscription, getSubscriptionForTenant } from '../services/billing.service';
import { ensureLicense } from '../services/user.service';

export async function attachTenantContext(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const tenant = await ensureTenantForUser(req.user);
    const subscription = (await getSubscriptionForTenant(tenant.id)) || (await ensureTrialSubscription(tenant));

    await ensureLicense(req.user.id);

    req.tenant = tenant;
    req.subscription = subscription;

    return next();
  } catch (error) {
    next(error);
  }
}
