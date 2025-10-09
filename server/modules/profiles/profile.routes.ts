import { Router, Request, Response } from 'express';
import { ProfileSourceType } from '../../types';
import { profileService } from './profile.service';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const profiles = await profileService.list(req.user!.id);
  res.json(profiles);
});

router.post('/', async (req: Request, res: Response) => {
  const { name, style, source } = req.body;
  const sourceType = ((typeof source === 'string' ? source : source?.type) ?? 'text') as ProfileSourceType;
  const profile = await profileService.create({
    userId: req.user!.id,
    name,
    style,
    source: sourceType,
  });
  res.status(201).json({ message: `Profile ${name} created.`, profile });
});

router.post('/active', (req: Request, res: Response) => {
  const { id } = req.body;
  req.session.activeProfileId = id;
  res.json({ activeProfileId: id });
});

export default router;
