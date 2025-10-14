import express from 'express';
import path from 'path';
import passport from 'passport';
import { corsMiddleware } from './config/cors';
import { sessionMiddleware } from './config/session';
import { configurePassport } from './config/passport';
import { isAuthenticated } from './middleware';
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profiles/profile.routes';
import chatRoutes from './modules/chat/chat.routes';
import integrationRoutes from './modules/integrations/integration.routes';
import billingRoutes from './modules/billing/billing.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import apiKeyRoutes from './modules/api-keys/api-key.routes';
import webhookRoutes from './modules/webhooks/webhook.routes';
import auditRoutes from './modules/audit/audit.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import memoryRoutes from './modules/memory/memory.routes';
import claudePluginRoutes from './modules/claude-plugin/plugin.routes';

configurePassport();

const clientBuildPath = path.resolve(process.cwd(), 'dist');

export const createApp = () => {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.use('/auth', authRoutes);

  app.use('/api/profiles', isAuthenticated, profileRoutes);
  app.use('/api/chat', isAuthenticated, chatRoutes);
  app.use('/api/integrations', isAuthenticated, integrationRoutes);
  app.use('/api/organizations', isAuthenticated, organizationRoutes);
  app.use('/api/organizations', isAuthenticated, apiKeyRoutes);
  app.use('/api/organizations', isAuthenticated, webhookRoutes);
  app.use('/api/audit', isAuthenticated, auditRoutes);
  app.use('/api/analytics', isAuthenticated, analyticsRoutes);
  app.use('/api/memory', isAuthenticated, memoryRoutes);
  app.use('/api/claude', claudePluginRoutes);
  app.use('/api/billing', billingRoutes);

  app.use(express.static(clientBuildPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  return app;
};
