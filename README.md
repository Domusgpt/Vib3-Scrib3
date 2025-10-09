# Scribe AI Platform 2.0

Scribe is a multi-channel AI scribe that learns how you communicate and automates the replies you do not have time to write. The 2.0 release turns the prototype into a modular SaaS product: it adds workspaces, subscription plans, integration governance, API key management, and a richer operator console built with modern React tooling.

## Platform architecture

| Layer | Responsibilities |
| --- | --- |
| **Client (React + Vite)** | Responsive dashboard, workspace navigation, chat/compose canvas, integration marketplace, billing management, API key console. Authentication state and platform metadata are provided through context providers so any view can render instantly. |
| **API Gateway (Express + Passport)** | Secure OAuth flows (Google/Facebook), session management, tenant hydration, and request middleware enforcing authentication & subscription requirements. |
| **Domain services** | Modular services for AI orchestration, billing, integrations, profiles, usage metering, and API key generation. Each service operates on a shared LowDB persistence layer that can be swapped with Postgres or another production database. |
| **LLM providers** | Pluggable strategy for Gemini and OpenAI. If keys are missing the gateway degrades gracefully and returns an informative response. |

### Backend modules

```
server/src
├── app.ts                  # Express app factory with middleware + routing
├── config/
│   ├── env.ts              # Zod-validated environment configuration
│   ├── integrations.ts     # Integration marketplace catalogue
│   ├── passport.ts         # OAuth strategies & serialization
│   └── plans.ts            # Subscription catalogue with limits
├── controllers/            # (future extension point)
├── database/db.ts          # LowDB initialization and schema defaults
├── middleware/             # Auth, tenant context, subscription guards
├── routes/                 # Auth, chat, profiles, platform, billing, integrations
└── services/               # Billing, AI gateway, profiles, integrations, api keys, tenants, usage, users
```

Each request passes through `requireAuthentication` and `attachTenantContext`, which materialise the workspace, ensure a trial subscription exists, and bind subscription/licence metadata onto the request. Feature gates can then simply check `req.subscription`.

### Frontend modules

```
App.tsx                     # Router + layout wiring
components/
  layout/AppLayout.tsx      # Persistent shell & navigation
  compose/                  # Chat canvas UI and sidebars
pages/                      # Overview, Compose, Integrations, Billing, API Keys
providers/                  # Auth and platform context providers
services/                   # REST helpers shared across views
```

The UI ships with five primary screens:

1. **Overview** – workspace snapshot, active plan, usage counters, and next-best actions.
2. **Compose** – the conversational drafting studio powered by the AI gateway and style profiles.
3. **Integrations** – marketplace with connection state, scope visibility, and connect/disconnect flows.
4. **Billing** – plan catalogue with upgrade/checkout hooks and trial activation.
5. **API Keys** – key issuance (with hashed storage) and revocation workflow for builders embedding Scribe.

## Getting started

### Prerequisites

- Node.js ≥ 18
- npm (ships with Node)

### 1. Install dependencies

```bash
npm install
npm install --prefix server
```

### 2. Configure environment variables

Create `server/.env` using the template below:

```dotenv
SESSION_SECRET="long_random_string"
BASE_URL="http://localhost:3001"

# OAuth client credentials
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."

# LLM providers (optional but recommended)
API_KEY="your_gemini_key"
OPENAI_API_KEY="your_openai_key"

# Optional billing integrations
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_SCALE_MONTHLY="price_..."
```

Authorise the following redirect URIs with Google and Meta:

- `http://localhost:3001/auth/google/callback`
- `http://localhost:3001/auth/facebook/callback`

### 3. Run the platform

```bash
# Terminal 1 – API + SSR bundle
npm run server --prefix server

# Terminal 2 – Frontend during development
npm run dev
```

Navigate to `http://localhost:3000` for the Vite dev server (the Express server will serve the compiled bundle in production).

## REST API summary

All endpoints are served from the Express gateway (`BASE_URL`, defaults to `http://localhost:3001`). Sessions require cookies (`credentials: include`).

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| GET | `/auth/google` | Initiate Google OAuth. |
| GET | `/auth/google/callback` | Google OAuth callback. |
| GET | `/auth/facebook` | Initiate Facebook OAuth. |
| GET | `/auth/facebook/callback` | Facebook OAuth callback. |
| POST | `/auth/logout` | Destroy the session. |
| GET | `/auth/user` | Current user + workspace + subscription snapshot. |

### Compose & profiles

| Method | Path | Guards | Description |
| --- | --- | --- | --- |
| GET | `/api/profiles` | Auth | List style profiles + active profile. |
| POST | `/api/profiles` | Auth | Create a profile (from pasted samples or connected integrations). |
| POST | `/api/profiles/active` | Auth | Set the active style profile ID for the session. |
| POST | `/api/chat/continue` | Auth + Active subscription | Continue a conversation with the configured LLM provider. |

### Platform metadata

| Method | Path | Guards | Description |
| --- | --- | --- | --- |
| GET | `/api/platform/overview` | Auth | Workspace, subscription, usage metrics, API keys, and integration state. |
| POST | `/api/platform/api-keys` | Auth | Issue a new API key (hashed at rest, clear text returned once). |
| DELETE | `/api/platform/api-keys/:id` | Auth | Revoke an API key. |

### Billing

| Method | Path | Guards | Description |
| --- | --- | --- | --- |
| GET | `/api/billing/plans` | Public | Plan catalogue. |
| POST | `/api/billing/checkout` | Auth | Simulated checkout URL generation for the requested plan. |
| POST | `/api/billing/activate` | Auth | Immediately activate/upgrade to a plan (post-checkout webhook simulation). |

### Integrations

| Method | Path | Guards | Description |
| --- | --- | --- | --- |
| GET | `/api/integrations/catalog` | Public | List available integrations, scopes, and status. |
| GET | `/api/integrations/connections` | Auth | List workspace connections. |
| POST | `/api/integrations/connect` | Auth | Persist a connection + scope grant for a provider. |
| POST | `/api/integrations/disconnect` | Auth | Revoke a provider connection. |

## Monetisation model

- **Plans** live in `server/src/config/plans.ts` and define price points, limits, and included seats. They can be piped into Stripe/Paddle using the provided checkout hook.
- **Trials** are automatically provisioned per workspace when a user authenticates; upgrade flows can call `POST /api/billing/activate` after a checkout webhook fires.
- **Usage metering** (`usage.service.ts`) stores per-period counts for messages, generated profiles, and automation triggers, enabling billing overages or quota enforcement.
- **API keys** use hashed storage and expose only truncated previews for dashboard display, reducing credential leakage risk.

## Swapping infrastructure

- Replace LowDB with Postgres by implementing repository adapters inside `server/src/services/*`—all persistence logic is already consolidated.
- Drop in additional OAuth providers by adding strategies to `config/passport.ts` and exposing them through the `/auth` router.
- Extend the integration marketplace by editing `config/integrations.ts`; the UI consumes the same catalogue to render available connectors.

## Testing notes

No automated test harness ships with the scaffold yet. The backend is TypeScript-strict and front-end components rely on prop typings to minimise runtime surprises. Add Vitest or Jest suites where critical once the business logic stabilises.
