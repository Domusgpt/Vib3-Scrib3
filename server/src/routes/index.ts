import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import chatRoutes from '../modules/chat/chat.routes';
import profileRoutes from '../modules/profiles/profile.routes';
import billingRoutes from '../modules/billing/billing.routes';
import integrationRoutes from '../modules/integrations/integration.routes';
import webhookRoutes from '../modules/webhooks/webhook.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/api/chat', chatRoutes);
router.use('/api/profiles', profileRoutes);
router.use('/api/billing', billingRoutes);
router.use('/api/integrations', integrationRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
