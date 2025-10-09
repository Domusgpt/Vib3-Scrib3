import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { db, initDb } from '../../infrastructure/db';

const router = Router();

type WebhookRequest = Request & { rawBody?: Buffer };

const verifySignature = async (req: WebhookRequest) => {
  await initDb();
  const signature = req.headers['x-scribe-signature'];
  if (typeof signature !== 'string') {
    return false;
  }
  const [userId, providedSignature] = signature.split('.');
  if (!userId || !providedSignature) {
    return false;
  }
  const secret = db.data.webhookSecrets.find((item) => item.id === userId);
  if (!secret) {
    return false;
  }
  const expected = crypto.createHmac('sha256', secret.secret).update(req.rawBody ?? Buffer.from('')).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expected));
};

router.post('/drafts', async (req: WebhookRequest, res: Response) => {
  const isValid = await verifySignature(req);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid webhook signature.' });
  }
  res.json({ received: true });
});

export default router;
