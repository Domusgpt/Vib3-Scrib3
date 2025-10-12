# Vib3-Scribe

Vib3-Scribe is the Clear Seas Solutions composition cockpit that powers the Parserator ecosystem. The web app pairs a glassmorphic React console with a governance-aware Node/Express API so teams can train, govern, and deploy writing agents that sound exactly like them.

---

## Platform highlights

- **Creator console** – `App.tsx` wires React Router to pages such as `HomePage`, `WorkspaceSettings`, `IntegrationsHub`, and `InsightsCenter` so creators can bounce between composition, administration, and telemetry with zero reloads.
- **Style profile intelligence** – `services/apiService.ts` exposes helpers for generating and switching writing profiles; the UI (via `components/ProfileModal` and `ChatView`) guides users through sourcing text or connected accounts.
- **Workspace governance** – `hooks/useConsolePageState.ts` centralizes auth, billing, and organization state. Server routes under `server/modules/organizations`, `api-keys`, `webhooks`, and `audit` provide multi-tenant controls, immutable logs, and scoped automation keys.
- **Integrated automations** – `server/modules/integrations` and `server/modules/chat` implement secure OAuth storage plus an LLM tool-calling loop that orchestrates Google and Facebook data without ever exposing tokens to the client.
- **Operational insight** – The `/insights` page taps `server/modules/analytics` to surface pulse scores, usage trends, and incident feeds inspired by the Nimbus-Guardian operational model.

All of these layers stay coordinated through Parserator telemetry so beta products like Nimbus-Guardian and Reposiologist can plug into the same account and governance fabric.

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

The root install script also pulls server dependencies (`server/package.json`).

### 2. Configure environment

Copy the sample file and update secrets and callback URLs for your workspace:

```bash
cp server/.env.example server/.env
```

Key variables include `SESSION_SECRET`, OAuth client credentials, `GEMINI_API_KEY`, and optional OpenAI/PagerDuty integrations.

### 3. Run the stack locally

Open two terminals:

```bash
# Terminal 1 – Vite dev server for the React console
npm run dev

# Terminal 2 – Express API (ts-node-dev)
npm run server
```

- The React console runs on `http://localhost:3000`.
- The API listens on `http://localhost:3001` and expects authenticated sessions against the dev database in `server/database`.

### 4. Build for the Express bundle (optional)

To have the API serve static assets from `dist/` (see `server/app.ts`), create a production build:

```bash
npm run build
npm run server
```

The Express server will host the compiled client and JSON APIs on `http://localhost:3001`.

---

## Project structure

```
Vib3-Scrib3/
├── App.tsx                     # Router + global providers for the console experience
├── components/                 # Chat UI, billing sidebar, integration badges, modals
├── hooks/                      # Console context, billing state, authentication helpers
├── pages/                      # Home, Workspace settings, Integrations hub, Insights center
├── services/apiService.ts      # Typed fetch wrappers for chat, billing, integrations, orgs
├── server/                     # Node/Express backend with feature modules & lowdb persistence
│   ├── modules/                # auth, chat, profiles, billing, integrations, analytics, etc.
│   ├── config/                 # CORS, session, Passport, environment validation
│   └── database/               # lowdb adapters, seeds, and fixtures
└── utils/                      # Shared helpers used across the client
```

Refer to `DEVELOPMENT_HANDOFF.md` for the long-form product vision, roadmap status, and operational readiness notes.

---

## Contributing & roadmap

1. Work off feature branches and keep the Parserator naming consistent (`Vib3-Scribe`, `Nimbus-Guardian`, `Reposiologist`).
2. Maintain the "smart server / dumb client" separation—no secrets or OAuth tokens should leak into the React bundle.
3. Prefer typed services and hooks so Console experiences stay predictable as we expand the Parserator ecosystem.

Issues and roadmap conversations live in the Parserator beta workspace. Reach out to Paul Phillips @ Clear Seas Solutions for access.
