import { Router, Request, Response } from 'express';
import { organizationService } from '../organizations/organization.service';
import { webhookService } from './webhook.service';
import { WebhookEvent } from '../../types';

const router = Router({ mergeParams: true });

router.use((req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  next();
});

router.get('/:organizationId/webhooks', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const webhooks = await webhookService.list(organizationId);
    res.json(webhooks);
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to load webhooks.' });
  }
});

router.post('/:organizationId/webhooks', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const { url, events } = req.body as { url: string; events?: WebhookEvent[] };
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  if (!url) {
    return res.status(400).json({ message: 'Webhook URL is required.' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const webhook = await webhookService.create({
      organizationId,
      actorId: req.user.id,
      url,
      events,
    });
    res.status(201).json(webhook);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to create webhook.' });
  }
});

router.delete('/:organizationId/webhooks/:webhookId', async (req: Request, res: Response) => {
  const { organizationId, webhookId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    await webhookService.remove(organizationId, req.user.id, webhookId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to delete webhook.' });
  }
});

router.post('/:organizationId/webhooks/:webhookId/test', async (req: Request, res: Response) => {
  const { organizationId, webhookId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const result = await webhookService.test(organizationId, req.user.id, webhookId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to test webhook.' });
  }
});

export default router;
