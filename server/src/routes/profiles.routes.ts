import { Router } from 'express';
import { z } from 'zod';

import { requireAuthentication } from '../middleware/authenticated';
import { attachTenantContext } from '../middleware/tenant';
import { createProfile, listProfiles } from '../services/profile.service';
import { generateStyleFromSamples } from '../services/ai.service';

const router = Router();

const createProfileSchema = z.object({
  name: z.string().min(3).max(120),
  source: z.enum(['text', 'gmail', 'facebook']),
  samples: z.string().optional(),
});

router.use(requireAuthentication, attachTenantContext);

router.get('/', async (req, res) => {
  const profiles = await listProfiles(req.user!.id);
  res.json({ profiles, activeProfileId: req.session?.activeProfileId ?? null });
});

router.post('/', async (req, res) => {
  const parsed = createProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const { name, source, samples } = parsed.data;
  let style = 'Style analysis pending.';

  if (samples) {
    const profile = await generateStyleFromSamples(req.user!, req.tenant!.id, name, samples);
    req.session!.activeProfileId = profile.id;
    return res.status(201).json({ profile, activeProfileId: profile.id });
  }

  const profile = await createProfile(req.user!, name, source, style);
  req.session!.activeProfileId = profile.id;
  res.status(201).json({ profile, activeProfileId: profile.id });
});

router.post('/active', async (req, res) => {
  const schema = z.object({ id: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  req.session!.activeProfileId = parsed.data.id;
  res.json({ activeProfileId: parsed.data.id });
});

export default router;
