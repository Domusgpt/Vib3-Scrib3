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

router.get('/:organizationId/export', async (req: Request, res: Response) => {
  const { organizationId } = req.params;
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  const format = (req.query.format as string | undefined)?.toLowerCase() ?? 'json';
  const since = req.query.since as string | undefined;
  const parsedLimit = req.query.limit !== undefined ? Number(req.query.limit) : NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

  try {
    await organizationService.assertRole(req.user.id, organizationId, ['owner', 'admin']);
    const logs = await auditService.export(organizationId, { since, limit });

    if (format === 'csv') {
      const csv = auditService.toCsv(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${organizationId}-audit-${Date.now()}.csv"`,
      );
      return res.send(csv);
    }

    res.json(logs);
  } catch (error) {
    res
      .status(400)
      .json({ message: error instanceof Error ? error.message : 'Unable to export audit log.' });
  }
});

export default router;
