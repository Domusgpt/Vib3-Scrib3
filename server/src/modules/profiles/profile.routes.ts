import { Request, Response, Router } from 'express';
import type { Session } from 'express-session';
import { db, initDb } from '../../infrastructure/db';
import { requireAuth } from '../../middleware/auth';
import type { StyleProfile, User } from '../../shared/types';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: Request, res: Response) => {
  await initDb();
  const user = req.user as User;
  const userId = user.id;
  const profiles = db.data.style_profiles
    .filter((profile: StyleProfile) => profile.userId === userId)
    .sort(
      (a: StyleProfile, b: StyleProfile) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  res.json(profiles);
});

router.post('/', async (req: Request, res: Response) => {
  await initDb();
  const { name, style, source } = req.body as Partial<StyleProfile> & { source?: string };
  if (!name) {
    return res.status(400).json({ message: 'Profile name is required.' });
  }

  const profile: StyleProfile = {
    id: `profile_${Date.now()}`,
    userId: (req.user as User).id,
    name,
    style: style || 'Style pending AI analysis.',
    source: (source as StyleProfile['source']) || 'text',
    createdAt: new Date().toISOString(),
  };

  db.data.style_profiles.push(profile);
  await db.write();

  res.status(201).json({ profile });
});

router.post('/active', async (req: Request, res: Response) => {
  const { id } = req.body as { id?: string };
  if (!id) {
    return res.status(400).json({ message: 'Profile id is required.' });
  }
  if (req.session) {
    (req.session as Session & { activeProfileId?: string }).activeProfileId = id;
  }
  res.json({ activeProfileId: id });
});

router.put('/:id', async (req: Request, res: Response) => {
  await initDb();
  const profile = db.data.style_profiles.find((item) => item.id === req.params.id && item.userId === req.user!.id);
  if (!profile) {
    return res.status(404).json({ message: 'Profile not found.' });
  }
  const { name, style } = req.body as Partial<StyleProfile>;
  if (name) profile.name = name;
  if (style) profile.style = style;
  await db.write();
  res.json({ profile });
});

router.delete('/:id', async (req: Request, res: Response) => {
  await initDb();
  db.data.style_profiles = db.data.style_profiles.filter(
    (profile: StyleProfile) => !(profile.id === req.params.id && profile.userId === (req.user as User).id)
  );
  await db.write();
  res.status(204).send();
});

export default router;
