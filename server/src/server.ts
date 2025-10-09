import http from 'http';

import app from './app';
import { env } from './config/env';

const PORT = Number(env.PORT || 3001);

const server = http.createServer(app);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Scribe server running on http://localhost:${PORT}`);
});
