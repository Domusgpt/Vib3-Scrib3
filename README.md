# Scribe AI Platform

Scribe is a multi-provider AI platform that learns your writing style from email, social, and manual training sources to act as your digital scribe. It generates responses in your unique voice, enforces licensing rules, and exposes clean APIs for future integrations.

---

## 1. Architecture Overview

### 1.1 Frontend (React + TypeScript)
- Single-page application powered by React and Tailwind classes.
- Holds only presentational state (modal visibility, active profile, chat history).
- Talks to the backend via a typed `apiService` and never handles OAuth tokens or API keys.
- New billing sidebar surfaces plan status, usage, and upgrade flows without exposing secrets.
- Dedicated "Operations Insights" console ( `/insights`) visualizes message velocity, automation health, and incident telemetry in Nimbus Guardian-inspired glassmorphism.

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
| `analytics` | Aggregated usage trends, incident feeds, and operational recommendations powering the insights console |
| `alerts` | Slack and PagerDuty dispatchers for governance limit breaches |

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
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_ROUTING_KEY=...
```

### 2.4 Run Locally
```bash
npm run dev        # start the Vite client on http://localhost:3000
npm run server     # start the API + session server on http://localhost:3001
```
Use the Vite dev server during development so the client hot-reloads while the Express API proxies data. For a production-like
test, run `npm run build` once and then start only `npm run server` (it serves the assets from `dist/`).

### 2.5 Run Backend Regression Tests

```bash
npm run test
```

The test runner executes the server Vitest suite (located under `server/__tests__`), covering the OAuth callback response shape
and license guard middleware so privileged routes stay protected.

> 📦 Looking for a quick release checklist? See [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) for the exact commands and smoke
tests required to ship the MVP build.

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
- **Identity Governance**: `/api/organizations/:id/auth-policy` lets owners enforce Google or Facebook single sign-on and records every change in the audit log while rate-limiting invitation and key sprawl.
- **Governance Alerts**: Rate limit overrides for invitations and API keys notify Slack/PagerDuty responders immediately and require owner acknowledgement through the workspace UI.
- **Audit Compliance**: `/api/audit/:id/export?format=csv&since=YYYY-MM-DD` delivers CSV exports scoped by date range for incident reviews or legal archiving.
- **Operations Intelligence**: `/api/analytics/pulse`, `/api/analytics/usage-trend`, and `/api/analytics/incidents` fuel the real-time Insights console with workspace-level recommendations and telemetry.

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
- `GET /api/analytics/pulse` – workspace automation pulse (message velocity, automation score, recommendations)
- `GET /api/analytics/usage-trend` – six-month message/token chart data
- `GET /api/analytics/incidents` – latest governance, billing, and integration events
- `GET /api/organizations` – list workspaces, seat summaries, current role
- `POST /api/organizations` – create a new team workspace
- `POST /api/organizations/active` – switch the active workspace in session
- `GET /api/organizations/:id/members` – enumerate active members with roles
- `GET /api/organizations/:id/invitations` / `POST /api/organizations/:id/invitations` – manage pending invites
- `GET|PUT /api/organizations/:id/auth-policy` – inspect or enforce workspace single sign-on providers
- `POST /api/organizations/invitations/:token/accept` – accept an emailed invite
- `GET|POST|DELETE /api/organizations/:id/api-keys` – issue and revoke scoped API keys
- `GET|POST|DELETE /api/organizations/:id/webhooks` – register automation targets
- `POST /api/organizations/:id/webhooks/:webhookId/test` – fire a signed test payload
- `GET /api/audit/:organizationId` – retrieve the latest workspace audit entries
- `GET /api/audit/:organizationId/export?format=csv` – download audit history (supports optional `since=YYYY-MM-DD`)

---

## 5. Frontend Product Notes
- **Chat-first workflow**: All style creation and revisions still flow through natural language prompting.
- **Profiles**: Hover tooltips preview parsed style attributes using `parseStylePreview`.
- **Billing Drawer**: Users always see their current plan, usage bar, seat utilisation, and one-click monetization actions.
- **Workspace Switcher**: The sidebar lets authenticated users jump between personal and team workspaces, while `/workspace` exposes member management, invite revocation, API key lifecycle controls, webhook testing/deletion, and the live audit log.
- **Operations Guardrails**: Workspace settings surface override prompts that page the on-call team whenever invite or API key thresholds are exceeded, and audit exports can be pulled directly from the console.
- **Integration Hub**: `/integrations` provides a glassmorphic control center for Gmail, Facebook, and upcoming messaging connectors with live health, sample counts, and one-click sync or disconnect actions.
- **Insights Console**: `/insights` aggregates message velocity, automation confidence, and audit incidents with proactive recommendations.
- **Access Policies**: Workspace settings expose single sign-on enforcement with Google/Facebook toggles, live status, and audit-backed history to keep governance transparent.
- **Resilience**: API errors are routed to chat as system messages so the user understands next steps.

---

## 6. Next Steps & Extensibility
- Swap `lowdb` for a managed database (PostgreSQL) by replacing `database/client.ts` without touching higher layers.
- Connect checkout + customer portal endpoints to a real billing provider.
- Expand integrations (Slack, Outlook) by adding new modules under `server/modules` that follow the same pattern.
- Layer feature flags or seat management on top of the existing `Subscription` model.
- Wire the webhook delivery queue to a background worker (BullMQ/SQS) for guaranteed delivery semantics.
- Extend API key scopes to cover upcoming modules (analytics exports, knowledge bases) and surface key rotation reminders or expirations in-product.
- Add scheduled audit-log archival/retention policies (S3, configurable retention windows) on top of the new CSV export surface.

Scribe AI now ships with a production-ready architecture, monetization hooks, and a cohesive user experience that can grow into an enterprise-grade writing copilot.
