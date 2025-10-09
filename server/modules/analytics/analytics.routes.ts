import { Request, Response, Router } from 'express';
import { analyticsService } from './analytics.service';

const router = Router();

router.get('/pulse', async (req: Request, res: Response) => {
  try {
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const pulse = await analyticsService.getWorkspacePulse(req.user!.id, organizationId);
    res.json(pulse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load workspace pulse.';
    res.status(400).json({ message });
  }
});

router.get('/usage-trend', async (req: Request, res: Response) => {
  try {
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const months = req.query.months ? Number(req.query.months) : 6;
    const trend = await analyticsService.getUsageTrend(req.user!.id, organizationId, months);
    res.json({ trend });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load usage trend.';
    res.status(400).json({ message });
  }
});

router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const organizationId = typeof req.query.organizationId === 'string' ? req.query.organizationId : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 8;
    const incidents = await analyticsService.getIncidentFeed(req.user!.id, organizationId, limit);
    res.json({ incidents });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load incident feed.';
    res.status(400).json({ message });
  }
});

export default router;
