import { Router, Request, Response } from 'express';
import { hasActiveLicense } from '../../middleware';
import { chatService } from './chat.service';
import { MessageAuthor } from '../../types';

const router = Router();

router.post('/continue', hasActiveLicense, async (req: Request, res: Response) => {
  const { prompt, history, provider } = req.body;
  const activeProfileId = req.session?.activeProfileId;
  const activeOrganizationId = req.session?.activeOrganizationId;

  try {
    const responseMessage = await chatService.continueConversation(
      req.user!.id,
      {
        prompt,
        history,
        provider,
        context: { activeProfileId, user: req.user! },
      },
      activeOrganizationId ?? undefined,
    );
    res.json(responseMessage);
  } catch (error) {
    console.error('Error in conversation:', error);
    res.status(500).json({ author: MessageAuthor.SYSTEM, text: 'Sorry, I encountered an error. Please try again.' });
  }
});

export default router;
