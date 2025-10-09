# Scribe AI Platform

Scribe is a multi-provider AI platform that learns your writing style from email, social, and manual training sources to act as your digital scribe. It generates responses in your unique voice, enforces licensing rules, and exposes clean APIs for future integrations.

---

## 1. Architecture Overview

### 1.1 Frontend (React + TypeScript)
- Single-page application powered by React and Tailwind classes.
- Holds only presentational state (modal visibility, active profile, chat history).
- Talks to the backend via a typed `apiService` and never handles OAuth tokens or API keys.
- New billing sidebar surfaces plan status, usage, and upgrade flows without exposing secrets.

### 1.2 Backend (Node.js + Express + TypeScript)
The backend is modularized into feature domains under `server/modules` with explicit boundaries:

| Module | Responsibility |
| --- | --- |
| `auth` | OAuth (Google, Facebook), session serialization, authenticated user snapshot |
| `profiles` | CRUD for writing style profiles and active profile switching |
| `chat` | Gemini-powered tool calling loop, usage tracking, error hardening |
| `integrations` | Secure management of third-party tokens and data sampling utilities |
| `billing` | Subscription plans, trials, checkout URL brokering, usage snapshots |
| `licenses` | License persistence aligned with subscription status |
| `organizations` | Multi-tenant workspaces, membership roles, invitations, seat tracking |
| `api-keys` | Issuance, revocation, and auditing of programmatic access keys |
| `webhooks` | Outbound event subscriptions for downstream automation |
| `audit` | Immutable audit trail used across administrative modules |

Supporting layers:
- `config/` centralizes environment validation (`zod`), session, CORS, and Passport strategy registration.
- `database/` wraps `lowdb` with initialization + seeding of default billing plans, and is swappable with a real database.
- `lib/logger` exposes a minimal structured logger used across modules.

### 1.3 Database & Data Model
- Current persistence uses `lowdb` to persist `users`, `style_profiles`, `licenses`, `subscriptions`, `usage`, `billingPlans`, `organizations`, `memberships`, `invitations`, `apiKeys`, `webhooks`, and `auditLogs` in `server/db.json`.
- `database/seed.ts` injects three default plans (Free, Pro, Enterprise) so monetization is live out of the box and initializes governance collections.
- Usage records are stored per-user, per-month to enforce limits and power analytics.
- Every authenticated user receives a personal workspace; teams can spawn additional workspaces with their own seats, API keys, and webhooks.

---

## 2. Setup & Deployment

### 2.1 Prerequisites
- Node.js ≥ 18
- npm or yarn

### 2.2 Install
```bash
npm install
```
This installs both the root workspace dependencies and server-specific packages.

### 2.3 Configure Environment
Create `server/.env` (see `server/.env.example`) with:
```
SESSION_SECRET=super_secure_value
BASE_URL=http://localhost:3001
CLIENT_ORIGIN=http://localhost:3000
API_KEY=<google_gemini_key>
OPENAI_API_KEY=<optional_openai_key>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
```

### 2.4 Run Locally
```bash
npm run server
```
Browse to `http://localhost:3001`. The Express server serves the compiled client from `dist/`.

---

## 3. Monetization & Platform Experience
- **Plan Catalog**: `/api/billing/plans` exposes seeded pricing tiers (Free, Pro, Enterprise) with limits for messages, integrations, and seats.
- **Trials**: Authenticated users can start a 14-day Pro trial via `/api/billing/trial`. The server issues a subscription record and activates a license automatically.
- **Checkout Deep Links**: `/api/billing/checkout` fabricates secure upgrade URLs (ready to integrate with Stripe or Paddle).
- **Customer Portal**: `/api/billing/portal` returns a management URL (placeholder domain) so customers can manage billing on demand.
- **Usage Enforcement**: Every AI response increments a monthly counter through `billingService.recordMessageUsage`, powering `/api/billing/usage` and UI gauges (per workspace seat counts are surfaced alongside usage).
- **Workspaces**: `/api/organizations` exposes the authenticated user's personal and team workspaces, seat consumption, and role.
- **Programmatic Access**: `/api/organizations/:id/api-keys` issues scoped API tokens (chat, profiles, billing) and tracks their usage.
- **Automation**: `/api/organizations/:id/webhooks` registers outbound webhooks with signed deliveries and `/api/audit/:id` provides a compliance-grade activity feed.

The client sidebar surfaces this information via the new `BillingSummary` component: plan name, renewal timing, remaining messages, and context-aware CTA (start trial, finish upgrade, or manage billing).

---

## 4. API Surface (partial)
All endpoints live under `BASE_URL` and respond with JSON.

### 4.1 Auth
- `GET /auth/google` / `GET /auth/google/callback`
- `GET /auth/facebook` / `GET /auth/facebook/callback`
- `POST /auth/logout`
- `GET /auth/user` → `{ isAuthenticated, user, license, subscription, usage, organizations, activeOrganizationId, invitations }`

### 4.2 Profiles
- `GET /api/profiles` – list user profiles
- `POST /api/profiles` – create profile (manual override)
- `POST /api/profiles/active` – set active profile in session

### 4.3 Chat
- `POST /api/chat/continue` – orchestrates Gemini tool-calling flow with license enforcement

### 4.4 Integrations
- `GET /api/integrations/sample-count?source=gmail|facebook`
- `POST /api/integrations/disconnect`

### 4.5 Billing
- `GET /api/billing/plans`
- `GET /api/billing/usage`
- `POST /api/billing/trial`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`

### 4.6 Workspace & Platform APIs
- `GET /api/organizations` – list workspaces, seat summaries, current role
- `POST /api/organizations` – create a new team workspace
- `POST /api/organizations/active` – switch the active workspace in session
- `GET /api/organizations/:id/members` – enumerate active members with roles
- `GET /api/organizations/:id/invitations` / `POST /api/organizations/:id/invitations` – manage pending invites
- `POST /api/organizations/invitations/:token/accept` – accept an emailed invite
- `GET|POST|DELETE /api/organizations/:id/api-keys` – issue and revoke scoped API keys
- `GET|POST|DELETE /api/organizations/:id/webhooks` – register automation targets
- `POST /api/organizations/:id/webhooks/:webhookId/test` – fire a signed test payload
- `GET /api/audit/:organizationId` – retrieve the latest workspace audit entries

---

## 5. Frontend Product Notes
- **Chat-first workflow**: All style creation and revisions still flow through natural language prompting.
- **Profiles**: Hover tooltips preview parsed style attributes using `parseStylePreview`.
- **Billing Drawer**: Users always see their current plan, usage bar, seat utilisation, and one-click monetization actions.
- **Workspace Switcher**: The sidebar lets authenticated users jump between personal and team workspaces, while `/workspace` exposes member management, invite revocation, API key lifecycle controls, webhook testing/deletion, and the live audit log.
- **Integration Hub**: `/integrations` provides a glassmorphic control center for Gmail, Facebook, and upcoming messaging connectors with live health, sample counts, and one-click sync or disconnect actions.
- **Resilience**: API errors are routed to chat as system messages so the user understands next steps.

---

## 6. Next Steps & Extensibility
- Swap `lowdb` for a managed database (PostgreSQL) by replacing `database/client.ts` without touching higher layers.
- Connect checkout + customer portal endpoints to a real billing provider.
- Expand integrations (Slack, Outlook) by adding new modules under `server/modules` that follow the same pattern.
- Layer feature flags or seat management on top of the existing `Subscription` model.
- Wire the webhook delivery queue to a background worker (BullMQ/SQS) for guaranteed delivery semantics.
- Extend API key scopes to cover upcoming modules (analytics exports, knowledge bases) and surface key rotation reminders or expirations in-product.

Scribe AI now ships with a production-ready architecture, monetization hooks, and a cohesive user experience that can grow into an enterprise-grade writing copilot.
