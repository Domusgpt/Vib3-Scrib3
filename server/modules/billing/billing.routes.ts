import { Router, Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service';
import { licenseService } from '../licenses/license.service';
import { organizationService } from '../organizations/organization.service';

const router = Router();

router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/plans') {
    return next();
  }
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  return next();
});

router.get('/plans', async (_req: Request, res: Response) => {
  const plans = await billingService.getPlans();
  res.json(plans);
});

router.get('/usage', async (req: Request, res: Response) => {
  const requestedOrgId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
  try {
    if (requestedOrgId) {
      await organizationService.assertRole(req.user!.id, requestedOrgId, ['owner', 'admin', 'author', 'viewer']);
    }
    const usage = await billingService.getUsageSnapshot(
      req.user!.id,
      requestedOrgId ?? req.session?.activeOrganizationId ?? undefined,
    );
    res.json(usage);
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to load usage.' });
  }
});

router.post('/trial', async (req: Request, res: Response) => {
  const { planId, organizationId } = req.body as { planId: string; organizationId?: string };
  try {
    const result = await billingService.startTrial(
      req.user!.id,
      planId,
      organizationId ?? req.session?.activeOrganizationId ?? undefined,
    );
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to start trial.' });
  }
});

router.post('/checkout', async (req: Request, res: Response) => {
  const { planId, cadence, organizationId } = req.body as {
    planId: string;
    cadence: 'monthly' | 'yearly';
    organizationId?: string;
  };
  try {
    const session = await billingService.createCheckoutSession(
      req.user!.id,
      planId,
      cadence ?? 'monthly',
      organizationId ?? req.session?.activeOrganizationId ?? undefined,
    );
    res.json(session);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to create checkout session.' });
  }
});

router.post('/portal', async (req: Request, res: Response) => {
  try {
    const portal = await billingService.getCustomerPortalUrl(
      req.user!.id,
      req.body?.organizationId ?? req.session?.activeOrganizationId ?? undefined,
    );
    res.json(portal);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to open billing portal.' });
  }
});

router.get('/license', async (req: Request, res: Response) => {
  const license = await licenseService.getLicenseForUser(req.user!.id, req.session?.activeOrganizationId ?? undefined);
  res.json(license);
});

export default router;
