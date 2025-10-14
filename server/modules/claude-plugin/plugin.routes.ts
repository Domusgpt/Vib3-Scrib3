import { Router } from 'express';
import { pluginSignupService } from './plugin-signup.service';
import { isAuthenticated } from '../../middleware';
import { PluginSignupStage } from '../../types';

const router = Router();

const allowedStages: Array<PluginSignupStage> = ['discovered', 'memory_access_requested', 'converted'];

router.post('/signups', async (req, res) => {
  const { email, name, intent, notes, stage, command, metadata } = req.body ?? {};

  const normalisedStage = typeof stage === 'string' && allowedStages.includes(stage as PluginSignupStage)
    ? (stage as PluginSignupStage)
    : undefined;

  try {
    const signup = await pluginSignupService.recordSignup({
      email,
      name,
      intent,
      notes,
      stage: normalisedStage,
      command,
      metadata,
    });

    res.status(201).json(signup);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Unable to record signup' });
  }
});

router.get('/signups', isAuthenticated, async (_req, res) => {
  const signups = await pluginSignupService.list();
  res.json({ signups });
});

router.post('/signups/convert', isAuthenticated, async (req, res) => {
  const email = req.user?.email;
  if (!req.user || !email) {
    return res.status(400).json({ message: 'Authenticated user with email is required to convert signup' });
  }

  const signup = await pluginSignupService.markConverted(req.user.id, email);
  res.json({ signup });
});

export default router;
