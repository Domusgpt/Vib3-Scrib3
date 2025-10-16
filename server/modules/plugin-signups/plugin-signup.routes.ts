import { Router, Request, Response } from 'express';
import {
  pluginSignupService,
  RecordPluginSignupPayload,
  UpdatePluginSignupPayload,
} from './plugin-signup.service';
import { PluginSignupReason, PluginSignupStatus } from '../../types';
import { isAuthenticated } from '../../middleware';

const router = Router();

const isValidReason = (value: unknown): value is PluginSignupReason => {
  return value === 'memory-access' || value === 'profile-sync' || value === 'advanced-tools' || value === 'other';
};

const isValidStatus = (value: unknown): value is PluginSignupStatus => {
  return (
    value === 'new' ||
    value === 'awaiting-session' ||
    value === 'contacted' ||
    value === 'activated' ||
    value === 'snoozed' ||
    value === 'closed'
  );
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { limit, reason, since, source } = req.query;
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

router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'A signup id is required.' });
    }

    const body = req.body as Partial<UpdatePluginSignupPayload>;
    const payload: UpdatePluginSignupPayload = {};

    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }
      payload.status = body.status;
    }

    if (body.ownerId !== undefined) {
      payload.ownerId = typeof body.ownerId === 'string' && body.ownerId.trim().length > 0
        ? body.ownerId
        : null;
    }

    if (body.ownerName !== undefined) {
      payload.ownerName = typeof body.ownerName === 'string' && body.ownerName.trim().length > 0
        ? body.ownerName.trim()
        : null;
    }

    if (body.ownerEmail !== undefined) {
      payload.ownerEmail = typeof body.ownerEmail === 'string' && body.ownerEmail.trim().length > 0
        ? body.ownerEmail.trim().toLowerCase()
        : null;
    }

    if (body.nextActionAt !== undefined) {
      if (body.nextActionAt === null || body.nextActionAt === '') {
        payload.nextActionAt = null;
      } else if (typeof body.nextActionAt === 'string') {
        const parsed = new Date(body.nextActionAt);
        if (Number.isNaN(parsed.getTime())) {
          return res.status(400).json({ message: 'Invalid next action timestamp.' });
        }
        payload.nextActionAt = parsed.toISOString();
      } else {
        return res.status(400).json({ message: 'Invalid next action timestamp.' });
      }
    }

    if (body.note !== undefined) {
      if (body.note === null) {
        payload.note = null;
      } else if (typeof body.note === 'string') {
        payload.note = body.note;
      } else {
        return res.status(400).json({ message: 'Invalid note content.' });
      }
    }

    const user = req.user as { id?: string; name?: string; email?: string } | undefined;
    const actor = {
      id: user?.id,
      name: user?.name,
      email: user?.email,
    };

    const result = await pluginSignupService.update(id, payload, actor);
    res.json(result);
  } catch (error) {
    console.error('Failed to update plugin signup', error);
    res.status(500).json({ message: 'Unable to update plugin signup.' });
  }
});

export default router;
