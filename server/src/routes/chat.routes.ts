import { Router } from 'express';
import { z } from 'zod';

import { requireAuthentication } from '../middleware/authenticated';
import { attachTenantContext } from '../middleware/tenant';
import { requireActiveSubscription } from '../middleware/subscription';
import { continueConversation } from '../services/ai.service';
import { LLMProvider, MessageAuthor } from '../../../types';

const router = Router();

const historySchema = z.object({
  author: z.nativeEnum(MessageAuthor),
  text: z.string().optional(),
});

const chatSchema = z.object({
  prompt: z.string().min(1),
  history: z.array(historySchema).default([]),
  provider: z.nativeEnum(LLMProvider).default(LLMProvider.GEMINI),
});

router.post('/continue', requireAuthentication, attachTenantContext, requireActiveSubscription, async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.flatten() });
  }

  const message = await continueConversation({
    prompt: parsed.data.prompt,
    history: parsed.data.history,
    provider: parsed.data.provider,
    context: {
      user: req.user!,
      tenantId: req.tenant!.id,
      activeProfileId: req.session?.activeProfileId,
    },
  });

  res.json(message);
});

export default router;
