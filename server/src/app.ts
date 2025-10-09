import path from 'path';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';

import { env, isProduction } from './config/env';
import passport from './config/passport';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import profilesRoutes from './routes/profiles.routes';
import platformRoutes from './routes/platform.routes';
import billingRoutes from './routes/billing.routes';
import integrationsRoutes from './routes/integrations.routes';

const app = express();

app.use(
  cors({
    origin: isProduction ? env.BASE_URL : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/integrations', integrationsRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientBuildPath = path.resolve(__dirname, '../../dist');
app.use(express.static(clientBuildPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

export default app;
