import express, { Request, Response } from 'express';
import path from 'path';
import routes from './routes';
import { corsMiddleware } from './config/cors';
import { sessionMiddleware } from './config/session';
import passport from './config/passport';
import { errorHandler } from './middleware/error-handler';
import { initDb } from './infrastructure/db';

export const createApp = async () => {
  await initDb();
  const app = express();

  app.use(corsMiddleware);
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  const clientBuildPath = path.resolve(__dirname, '../../dist');
  app.use(express.static(clientBuildPath));

  app.use(routes);

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  app.use(errorHandler);

  return app;
};
