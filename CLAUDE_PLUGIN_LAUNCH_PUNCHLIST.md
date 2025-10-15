# Claude Plugin Launch Punchlist

These are the two items that still need owner sign-off before we can confidently list the rush Claude Code plugin for external use.

## 1. Provision a repeatable Vib3 session hand-off for plugin operators
- **Why**: Every plugin command expects a valid `VIBE3_SESSION` cookie before it will persist memories; otherwise it logs a signup and stops. We need a documented, secure way to issue that session to authorized operators after onboarding.
- **What to figure out**:
  - Decide how operators authenticate once their account is provisioned (e.g., login flow via the web app vs. temporary magic link).
  - Produce a short SOP that maps "account created" → "session cookie captured" so the `/context-harvest` and `/style-sync` cURL snippets can succeed without manual guesswork.
  - Confirm the SOP includes how to refresh expired cookies so `/api/memory` continues to work mid-project.
- **Where it shows up**: The plugin scripts check for `VIBE3_SESSION` before calling `/api/memory` and fall back to `POST /api/plugin-signups` when the cookie is missing, so the experience stalls without this hand-off in place.【F:claude-plugin/commands/context-harvest.md†L9-L46】【F:server/modules/memory/memory.routes.ts†L33-L76】

## 2. Operationalize signup follow-up + Firestore mirroring
- **Why**: We now capture intent via `POST /api/plugin-signups`, surface it in `/plugin-ops`, and optionally mirror it into Firestore. Without a clear follow-up workflow, the captured demand won’t convert into provisioned accounts or context memories.
- **What to figure out**:
  - Decide who owns reviewing the "Claude Plugin Operations" console and how often they triage new entries.
  - Connect Firestore (or another system of record) by supplying production credentials so signup + memory data replicate downstream, then verify the sync completes successfully.
  - Define the automated or manual sequence that turns each captured email/reason into an activated Vib3 workspace (e.g., CRM task, automated email, Slack alert).
- **Where it shows up**: The signup service records touches and pushes them to Firestore, while the operations console depends on those summaries to guide GTM follow-up.【F:server/modules/plugin-signups/plugin-signup.service.ts†L8-L119】【F:server/config/firebase.ts†L1-L75】【F:pages/PluginOpsCenter.tsx†L1-L161】
