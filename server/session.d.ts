import 'express-session';

declare module 'express-session' {
  interface SessionData {
    activeProfileId?: string;
    activeOrganizationId?: string;
  }
}
