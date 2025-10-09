import { Router, Request, Response } from 'express';
import { auditService } from './audit.service';
import { organizationService } from '../organizations/organization.service';

const router = Router();

router.get('/:organizationId', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const events = await auditService.list(organizationId, Number(req.query.limit) || 50);
    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to load audit events.' });
  }
});

export default router;
