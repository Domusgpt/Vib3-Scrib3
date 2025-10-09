import { Request, Response, Router } from 'express';
import type { IntegrationName } from '../../shared/types';
import { requireAuth } from '../../middleware/auth';
import {
  connectIntegration,
  disconnectIntegration,
  getOrCreateWebhookSecret,
  listIntegrations,
} from './integration.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  const integrations = await listIntegrations(req.user!);
  res.json({ integrations });
});

router.post('/connect', async (req: Request, res: Response) => {
  const { integration } = req.body as { integration?: IntegrationName };
  if (!integration) {
    return res.status(400).json({ message: 'integration is required.' });
  }
  await connectIntegration(req.user!, integration);
  res.json({ message: `${integration} connected.` });
});

router.post('/disconnect', async (req: Request, res: Response) => {
  const { integration } = req.body as { integration?: IntegrationName };
  if (!integration) {
    return res.status(400).json({ message: 'integration is required.' });
  }
  await disconnectIntegration(req.user!, integration);
  res.json({ message: `${integration} disconnected.` });
});

router.get('/webhook-secret', async (req: Request, res: Response) => {
  const secret = await getOrCreateWebhookSecret(req.user!);
  res.json({ secret });
});

export default router;
