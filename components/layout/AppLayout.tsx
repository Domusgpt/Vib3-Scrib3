import React from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

import { useAuth } from '../../providers/AuthProvider';

const navItems = [
  { label: 'Overview', to: '/' },
  { label: 'Compose', to: '/compose' },
  { label: 'Integrations', to: '/integrations' },
  { label: 'Billing', to: '/billing' },
  { label: 'API Keys', to: '/api-keys' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { auth, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center space-x-8">
            <span className="text-lg font-semibold tracking-tight">Scribe Platform</span>
            <nav className="hidden gap-4 text-sm font-medium md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-md px-3 py-2 transition-colors',
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            {auth.isAuthenticated && auth.user ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="font-medium">{auth.user.name}</p>
                  <p className="text-xs text-slate-400">{auth.user.email}</p>
                </div>
                {auth.user.avatar && (
                  <img src={auth.user.avatar} alt={auth.user.name ?? 'User avatar'} className="h-9 w-9 rounded-full border border-slate-700" />
                )}
                <button
                  onClick={logout}
                  className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a
                href="/auth/google"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
