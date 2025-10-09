import { Request, Response, Router } from 'express';
import { requireActiveSubscription, requireAuth } from '../../middleware/auth';
import { continueConversation, countWritingSamples } from './ai.service';
import { LLMProvider, MessageAuthor } from '../../shared/types';
import type { User } from '../../shared/types';

const router = Router();

router.use(requireAuth);

router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    providers: [
      { id: LLMProvider.GEMINI, label: 'Google Gemini 2.5 Flash' },
      { id: LLMProvider.OPENAI, label: 'OpenAI GPT-4o mini' },
    ],
  });
});

router.post('/continue', requireActiveSubscription, async (req: Request, res: Response) => {
  try {
    const response = await continueConversation({
      ...req.body,
      provider: req.body.provider ?? LLMProvider.GEMINI,
      context: {
        ...(req.body.context || {}),
        user: req.user,
        session: req.session,
      },
    });
    res.json(response);
  } catch (error) {
    console.error('Error in conversation:', error);
    res.status(500).json({ author: MessageAuthor.SYSTEM, text: 'Sorry, I encountered an error. Please try again.' });
  }
});

router.get('/sample-count', async (req: Request, res: Response) => {
  const source = req.query.source as 'gmail' | 'facebook';
  const user = req.user as User;

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

export default router;
