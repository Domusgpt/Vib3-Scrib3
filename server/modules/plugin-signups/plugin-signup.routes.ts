import { Router, Request, Response } from 'express';
import { pluginSignupService, RecordPluginSignupPayload } from './plugin-signup.service';
import { PluginSignupReason } from '../../types';

const router = Router();

const isValidReason = (value: unknown): value is PluginSignupReason => {
  return value === 'memory-access' || value === 'profile-sync' || value === 'advanced-tools' || value === 'other';
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export default router;
