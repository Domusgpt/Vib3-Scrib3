# Scribe AI 2.0 – Development handoff

## 1. Product focus

Scribe is no longer a demo chat widget. The 2.0 platform introduces multi-tenant workspaces, monetisation levers (plans, usage metering, trials), an integration marketplace, and a controllable AI compose experience. Think of it as a billing-ready co-pilot that can be embedded in existing workflows via API keys.

### Key differentiators
- **Authentic automation**: style profiles encode tone and diction so generated replies sound like the user.
- **Enterprise readiness**: OAuth credentials never leave the server, API keys are hashed, and usage is metered per tenant.
- **Extensibility**: integrations, plans, and LLM providers are defined through configuration registries.

## 2. Technical blueprint

### Frontend (React + Vite)
- `AppLayout` renders a persistent navigation shell for Overview → Compose → Integrations → Billing → API Keys.
- `AuthProvider` and `PlatformProvider` expose authentication state and workspace metadata, allowing any page to react instantly to plan changes or new API keys.
- Compose view reuses the existing chat components but is now context-aware and derives session state from the providers.

### Backend (Express + TypeScript)
- `config/env.ts` validates environment variables with Zod; all secrets flow from here.
- `middleware/tenant.ts` ensures every request has a workspace, subscription, and licence before touching business logic.
- `services/*.ts` is the domain layer—billing, integrations, API keys, usage metering, profiles, AI orchestration. Swapping LowDB for Postgres means re-implementing these services without touching routes.
- Routes are split by capability (`auth`, `chat`, `profiles`, `platform`, `billing`, `integrations`). Each route sticks to validation + orchestration, delegating heavy lifting to services.

### Data model enhancements
- `Tenant`, `Subscription`, `UsageRecord`, `ApiKey`, and `IntegrationConnection` are new shared types.
- API keys store a hashed secret and expose a preview for UI display.
- Usage snapshots accumulate request counts that can drive plan limits or overages.

## 3. Integrations & permissions

The integration catalogue lives in `server/src/config/integrations.ts`. Each item declares scopes, a documentation URL, and rollout status (`stable`, `beta`, `coming_soon`). The front-end automatically consumes this metadata to render action buttons and scope summaries.

To add a provider:
1. Define it in the catalogue with required scopes.
2. Implement OAuth/token exchange in `integration.service.ts` (currently mocked for demo purposes).
3. Surface any additional server actions through a dedicated route/controller.

Permissions are enforced server-side; the client simply reflects connection state.

## 4. Monetisation hooks

- Plans are defined in `config/plans.ts` with pricing, limits, and included seats.
- `/api/billing/checkout` returns a fake checkout URL; wire this up to Stripe or Paddle by swapping the implementation.
- `/api/billing/activate` simulates the post-checkout webhook and updates the subscription.
- Usage metering records every chat message and profile generation for potential quota checks.

## 5. AI orchestration

`services/ai.service.ts` is the new entry point. It selects Gemini or OpenAI based on configured keys and falls back to a deterministic message when keys are absent. Style prompts are injected server-side so the client does not leak profile data.

Future work:
- Persist richer conversation transcripts for analytics.
- Expand tool-calling support so integrations can fetch context on demand (e.g., latest email thread before drafting).

## 6. Next steps checklist

1. **Replace LowDB** with a SQL adapter once environments are available.
2. **Swap mock checkout** with a real billing provider; map plan IDs to price IDs.
3. **Harden integrations** by implementing real OAuth handshakes for Slack/Salesforce.
4. **Add observability** (request logging, metrics) before opening to beta customers.
5. **Write automated tests** around the billing + platform routes—these underpin monetisation and should be stable.

With this refactor the codebase is cleanly layered, easy to extend, and ready for production hardening.
