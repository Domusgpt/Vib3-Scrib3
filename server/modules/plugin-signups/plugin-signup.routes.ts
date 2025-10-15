import { Router, Request, Response } from 'express';
import { pluginSignupService, RecordPluginSignupPayload } from './plugin-signup.service';
import { PluginSignupReason, PluginSignupStatus } from '../../types';
import { isAuthenticated } from '../../middleware';

const router = Router();

const isValidReason = (value: unknown): value is PluginSignupReason => {
  return value === 'memory-access' || value === 'profile-sync' || value === 'advanced-tools' || value === 'other';
};

const isValidStatus = (value: unknown): value is PluginSignupStatus => {
  return value === 'new' || value === 'contacted' || value === 'activated' || value === 'closed';
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { limit, reason, since, source, status } = req.query;
    const allSignups = await pluginSignupService.list();
    const summary = pluginSignupService.summarize(allSignups);

    let filtered = allSignups;

    if (typeof source === 'string' && source.trim().length > 0) {
      const normalizedSource = source.trim().toLowerCase();
      filtered = filtered.filter(signup => signup.source.toLowerCase() === normalizedSource);
    }

    if (typeof reason === 'string' && isValidReason(reason)) {
      filtered = filtered.filter(signup => signup.touches.some(touch => touch.reason === reason));
    }

    if (typeof status === 'string' && isValidStatus(status)) {
      filtered = filtered.filter(signup => signup.status === status);
    }

    if (typeof since === 'string') {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        filtered = filtered.filter(signup => new Date(signup.lastCapturedAt).getTime() >= sinceDate.getTime());
      }
    }

    let limited = filtered;
    if (typeof limit === 'string') {
      const numericLimit = Number.parseInt(limit, 10);
      if (!Number.isNaN(numericLimit) && numericLimit > 0) {
        limited = filtered.slice(0, numericLimit);
      }
    }

    res.json({
      signups: limited,
      summary,
      total: allSignups.length,
      filteredCount: filtered.length,
    });
  } catch (error) {
    console.error('Failed to list plugin signups', error);
    res.status(500).json({ message: 'Unable to load plugin signup records.' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, reason, command, note, source, metadata } = req.body as Partial<RecordPluginSignupPayload>;

    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'A valid email address is required.' });
    }

    if (!isValidReason(reason)) {
      return res.status(400).json({ message: 'Invalid reason provided.' });
    }

    const payload: RecordPluginSignupPayload = {
      email,
      reason,
      command: typeof command === 'string' ? command : undefined,
      note: typeof note === 'string' ? note : undefined,
      source: typeof source === 'string' ? source : undefined,
      metadata: metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : undefined,
    };

    const result = await pluginSignupService.record(payload);
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    console.error('Failed to record plugin signup', error);
    res.status(500).json({ message: 'Unable to record plugin signup.' });
  }
});

router.post('/:id/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { status, note } = req.body as { status?: PluginSignupStatus; note?: string };
    if (!isValidStatus(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const result = await pluginSignupService.recordFollowUp(
      req.params.id,
      status,
      { id: req.user.id, email: req.user.email ?? null, name: req.user.name ?? null },
      typeof note === 'string' ? note : undefined,
    );

    res.json(result);
  } catch (error) {
    console.error('Failed to update plugin signup status', error);
    res.status(500).json({ message: 'Unable to update plugin signup status.' });
  }
});

export default router;
