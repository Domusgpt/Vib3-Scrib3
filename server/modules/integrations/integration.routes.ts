import { Router, Request, Response } from 'express';
import { countWritingSamples } from '../chat/llm.service';
import { userService } from '../users/user.service';

const router = Router();

router.get('/sample-count', async (req: Request, res: Response) => {
  const source = req.query.source as 'gmail' | 'facebook';
  const user = req.user!;

  if (!source || (source !== 'gmail' && source !== 'facebook')) {
    return res.status(400).json({ message: 'Invalid source specified.' });
  }

  let accessToken: string | undefined;
  if (source === 'gmail') accessToken = user.google?.accessToken;
  if (source === 'facebook') accessToken = user.facebook?.accessToken;

  if (!accessToken) {
    return res.status(403).json({ message: `User is not connected to ${source}.` });
  }

  try {
    const count = await countWritingSamples(source, accessToken);
    res.json({ source, count });
  } catch (error) {
    console.error(`Error counting ${source} samples:`, error);
    res.status(500).json({ message: `Failed to count samples from ${source}.` });
  }
});

router.post('/disconnect', async (req: Request, res: Response) => {
  const { integration } = req.body as { integration: 'google' | 'facebook' };
  try {
    await userService.disconnectIntegration(req.user!.id, integration);
    res.json({ message: `Successfully disconnected ${integration}.` });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to disconnect integration.' });
  }
});

export default router;
