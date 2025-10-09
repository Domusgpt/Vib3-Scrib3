
# Scribe AI Platform

Scribe is a multi-provider AI platform that learns your writing style from the tools you already use. It ships with a modular, production-ready stack that handles secure OAuth handshakes, subscription monetisation, usage metering, and multi-model orchestration so you can drop the experience into any workflow.

## 1. Architecture Overview

This application is built on a layered architecture:

* **Frontend** – A React (TypeScript) SPA that uses dedicated contexts for authentication, subscriptions, and integrations. The UI exposes:
  * A workspace for drafting with model switching (Gemini and OpenAI).
  * Billing and usage dashboards powered by live plan definitions.
  * Integration management, including OAuth redirects and webhook key management.
* **Backend** – Node.js with Express and Passport, organised into feature modules under `server/src/modules`.
  * **Auth module**: Handles OAuth (Google/Facebook), session management, and ensures every new account receives a trial subscription.
  * **Chat module**: Orchestrates multi-provider conversations, including Gemini tool-calling loops and OpenAI fallbacks, then records usage for billing.
  * **Billing module**: Stores plans, subscriptions, and per-month usage limits so you can monetise without external vendors.
  * **Integrations module**: Normalises connection metadata for first-party OAuth flows and webhook-based integrations.
  * **Webhooks module**: Verifies signed callbacks to push generated drafts into other systems.
* **Data layer** – `lowdb` provides a lightweight persistence layer for local development. The schema already includes users, profiles, subscriptions, usage, plans, and webhook secrets and can be migrated to Postgres/Mongo in production.

---

## 2. Setup and Deployment

### Prerequisites

*   Node.js (v18 or later)
*   npm or yarn

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### Step 2: Install Dependencies

Install backend dependencies (the frontend is dependency-free and bundled at build time):

```bash
npm install --prefix server
```

### Step 3: Configure Environment Variables

Create a `.env` file inside the `server/` directory. Use the `server/.env.example` as a template.

```
# server/.env

# Session Management
SESSION_SECRET='REPLACE_WITH_A_LONG_RANDOM_STRING'

# Google Credentials (for Gmail Integration)
# Get from Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CLIENT_ID='YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
GOOGLE_CLIENT_SECRET='YOUR_GOOGLE_CLIENT_SECRET'

# Facebook Credentials (for Messenger Integration)
# Get from Meta for Developers -> App Dashboard
FACEBOOK_APP_ID='YOUR_FACEBOOK_APP_ID'
FACEBOOK_APP_SECRET='YOUR_FACEBOOK_APP_SECRET'

# AI Provider API Keys
# Get from Google AI Studio (ensure it's for Gemini)
API_KEY='YOUR_GOOGLE_GEMINI_API_KEY'
# Get from platform.openai.com
OPENAI_API_KEY='YOUR_OPENAI_API_KEY'

# Application URL (for OAuth Callbacks)
# For local development:
BASE_URL='http://localhost:3001'
```

### Step 4: Configure OAuth Redirect URIs

You must authorize the backend's callback URLs in your provider dashboards.

*   **Google Cloud Console:**
    *   Go to "APIs & Services" -> "Credentials".
    *   Select your OAuth 2.0 Client ID.
    *   Under "Authorized redirect URIs", add: `http://localhost:3001/auth/google/callback`
*   **Meta for Developers:**
    *   Go to your App -> "Facebook Login" -> "Settings".
    *   Under "Valid OAuth Redirect URIs", add: `http://localhost:3001/auth/facebook/callback`

### Step 5: Run the Application

Start the API and serve the production SPA bundle:

```bash
npm run server
```

Navigate to `http://localhost:3001` in your browser.

---

## 3. API Documentation

All API endpoints are prefixed with the `BASE_URL`.

### Authentication

*   `GET /auth/google`
    *   Initiates the Google OAuth 2.0 sign-in flow. Redirects to Google.
*   `GET /auth/google/callback`
    *   Callback URL for Google to redirect to after user consent.
*   `GET /auth/facebook`
    *   Initiates the Facebook OAuth 2.0 sign-in flow.
*   `GET /auth/facebook/callback`
    *   Callback URL for Facebook.
*   `POST /auth/logout`
    *   Logs the user out and destroys the session.
*   `GET /auth/user`
    *   Retrieves the currently authenticated user's profile and license status.

### Chat

* `GET /api/chat/providers` – returns the available LLM providers and friendly labels.
* `POST /api/chat/continue` – continues a conversation with the selected provider.
  * **Middleware:** `requireAuth`, `requireActiveSubscription`
  * **Body:** `{ prompt: string, history: ChatMessage[], provider?: LLMProvider, context?: { activeProfileId?: string } }`
* `GET /api/chat/sample-count?source=gmail|facebook` – counts messages available for ingestion from the connected integration.

### Style Profiles

* `GET /api/profiles` – list profiles for the authenticated user.
* `POST /api/profiles` – create a profile manually (LLM automation is also supported).
* `POST /api/profiles/active` – set the active profile in the session.
* `PUT /api/profiles/:id` – update profile metadata.
* `DELETE /api/profiles/:id` – remove a profile.

### Billing & Monetisation

* `GET /api/billing/plans` – returns the built-in plan catalogue (free, pro, scale).
* `GET /api/billing/subscription` – fetch the subscriber record for the current user.
* `POST /api/billing/subscription` – move the user to a different plan tier.
* `GET /api/billing/usage` – returns the current-month usage counter plus allowance status.

### Integrations

* `GET /api/integrations` – list integration definitions with connection state.
* `POST /api/integrations/connect` – mark an integration as connected (used for webhook/Zapier style integrations).
* `POST /api/integrations/disconnect` – revoke stored credentials/metadata for an integration.
* `GET /api/integrations/webhook-secret` – retrieve the HMAC secret used to sign outbound webhook payloads.

### Webhooks

* `POST /webhooks/drafts` – receive signed callbacks when Scribe generates new drafts for external systems. The `x-scribe-signature` header must include the user identifier and HMAC digest.
