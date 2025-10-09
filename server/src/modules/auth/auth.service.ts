import type { AuthState, Subscription, User } from '../../shared/types';
import { db, initDb } from '../../infrastructure/db';

export const buildAuthState = async (user?: User | null): Promise<AuthState> => {
  await initDb();
  if (!user) {
    return { isAuthenticated: false, user: null, license: null, subscription: null };
  }

  const license = db.data.licenses.find((lic) => lic.userId === user.id) || null;
  const subscription = db.data.subscriptions.find(
    (sub) => sub.userId === user.id && ['trialing', 'active'].includes(sub.status)
  ) as Subscription | undefined;

  return {
    isAuthenticated: true,
    user,
    license,
    subscription: subscription || null,
  };
};

export const ensureSubscription = async (user: User) => {
  await initDb();
  let subscription = db.data.subscriptions.find((sub) => sub.userId === user.id);
  if (!subscription) {
    subscription = {
      id: `sub_${Date.now()}`,
      userId: user.id,
      planId: 'free',
      status: 'trialing',
      startedAt: new Date().toISOString(),
    };
    db.data.subscriptions.push(subscription);
    await db.write();
  }
  return subscription;
};
