import { Router, Request, Response } from 'express';
import { apiKeyService } from './api-key.service';
import { organizationService } from '../organizations/organization.service';
import { ApiScope } from '../../types';

const router = Router({ mergeParams: true });

router.use(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  next();
});

router.get('/:organizationId/api-keys', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const keys = await apiKeyService.list(organizationId);
    res.json(keys);
  } catch (error) {
    res.status(403).json({ message: error instanceof Error ? error.message : 'Unable to load API keys.' });
  }
});

router.post('/:organizationId/api-keys', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  const { name, scopes, expiresAt } = req.body as {
    name: string;
    scopes: ApiScope[];
    expiresAt?: string;
  };
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  if (!name || !Array.isArray(scopes) || scopes.length === 0) {
    return res.status(400).json({ message: 'Name and at least one scope are required.' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const created = await apiKeyService.create({
      organizationId,
      actorId: req.user.id,
      name,
      scopes,
      expiresAt,
    });
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to create API key.' });
  }
});

router.delete('/:organizationId/api-keys/:keyId', async (req: Request, res: Response) => {
  const { organizationId, keyId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const key = await apiKeyService.revoke(organizationId, req.user.id, keyId);
    res.json(key);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to revoke API key.' });
  }
});

export default router;
