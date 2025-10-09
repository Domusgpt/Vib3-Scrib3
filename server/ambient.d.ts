import type { User as ScribeUser } from './types';

declare global {
  namespace Express {
    interface User extends ScribeUser {}
    interface Request {
      user?: ScribeUser;
    }
  }
}

export {};
