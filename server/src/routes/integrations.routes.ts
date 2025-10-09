import { Router } from 'express';
import { z } from 'zod';

import { requireAuthentication } from '../middleware/authenticated';
import { attachTenantContext } from '../middleware/tenant';
import { connectIntegration, disconnectIntegration, getIntegrationCatalog, listConnections } from '../services/integration.service';

const router = Router();

const connectSchema = z.object({
  provider: z.string(),
  scopes: z.array(z.string()).default([]),
});

router.get('/catalog', (_req, res) => {
  res.json({ integrations: getIntegrationCatalog() });
});

router.get('/connections', requireAuthentication, attachTenantContext, async (req, res) => {
  const connections = await listConnections(req.tenant!.id);
  res.json({ connections });
});

router.post('/connect', requireAuthentication, attachTenantContext, async (req, res) => {
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const connection = await connectIntegration(req.tenant!.id, parsed.data.provider, parsed.data.scopes);
  res.status(201).json({ connection });
});

router.post('/disconnect', requireAuthentication, attachTenantContext, async (req, res) => {
  const parsed = connectSchema.pick({ provider: true }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  await disconnectIntegration(req.tenant!.id, parsed.data.provider);
  res.status(204).send();
});

export default router;
