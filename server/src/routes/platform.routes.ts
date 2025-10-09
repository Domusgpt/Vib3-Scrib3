import { Router } from 'express';
import { z } from 'zod';

import { requireAuthentication } from '../middleware/authenticated';
import { attachTenantContext } from '../middleware/tenant';
import { getUsageSnapshot } from '../services/usage.service';
import { getPlanCatalog } from '../services/billing.service';
import { createApiKey, listApiKeys, revokeApiKey } from '../services/api-key.service';
import { getIntegrationCatalog, listConnections } from '../services/integration.service';
import { ApiKey } from '../../../types';

const router = Router();

const createKeySchema = z.object({
  label: z.string().min(3).max(60),
});

function sanitizeApiKey(key: ApiKey) {
  const { hashedKey, ...rest } = key;
  return rest;
}

router.get('/overview', requireAuthentication, attachTenantContext, async (req, res) => {
  const tenant = req.tenant!;
  const subscription = req.subscription;
  const usage = await getUsageSnapshot(tenant.id);
  const integrations = await listConnections(tenant.id);
  const apiKeys = (await listApiKeys(tenant.id)).map(sanitizeApiKey);

  res.json({
    tenant,
    subscription,
    usage,
    plans: getPlanCatalog(),
    integrations,
    integrationCatalog: getIntegrationCatalog(),
    apiKeys,
  });
});

router.post('/api-keys', requireAuthentication, attachTenantContext, async (req, res) => {
  const parsed = createKeySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const result = await createApiKey(req.tenant!.id, parsed.data.label);
  res.status(201).json({ apiKey: sanitizeApiKey(result.key), secret: result.secret });
});

router.delete('/api-keys/:id', requireAuthentication, attachTenantContext, async (req, res) => {
  await revokeApiKey(req.tenant!.id, req.params.id);
  res.status(204).send();
});

export default router;
