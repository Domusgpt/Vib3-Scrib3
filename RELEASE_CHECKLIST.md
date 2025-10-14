# MVP Release Checklist

This guide captures the minimum steps required to validate the Scribe AI console and ship an MVP-ready release without pulling in unfinished roadmap work.

## 1. Environment Setup
- Node.js 18+
- Run `npm install` at the repo root (installs web client deps and triggers `npm install --prefix server`).
- Copy `server/.env.example` to `server/.env` and populate the OAuth, Gemini, and session secrets.
- (Optional) Seed demo data by keeping the default values in `server/database/seed.ts`.

## 2. Automated Checks
Run these from the repository root after installing dependencies:

| Purpose | Command |
| --- | --- |
| Type safety for the client | `npm run typecheck` |
| Production client build | `npm run build` |
| Compile the API server | `npm run build --prefix server` |

The bundle build is required so the Express server can serve the React app from `dist/` in production.

## 3. Manual QA Smoke Test
Use one authenticated account and one invited teammate to walk the happy path. Focus on verifying the guard rails that already exist rather than adding new ones.

1. **Authentication** – Complete the Google OAuth flow, then log out and back in. Confirm the active workspace and usage snapshot load after sign-in.
2. **Chat MVP** – Open the home page, send a prompt, and confirm a response is returned and appended to history.
3. **Billing CTA** – From the sidebar, start a trial (if eligible) or open the upgrade flow. Confirm the usage gauge refreshes afterward.
4. **Workspace switching** – Use the sidebar to swap between the personal workspace and a team workspace. Make sure the summary/header update.
5. **Member management** – Invite a teammate, accept via the emailed token, and adjust their role from the workspace settings screen.
6. **Integrations hub** – Trigger a sample sync or disconnect for one connector and verify the status pill updates without needing a refresh.
7. **Insights console** – Load `/insights` and confirm analytics cards render (pulse, trend, incidents) without API errors.
8. **Audit log** – Visit the audit tab, filter or export, and confirm a CSV download is generated.

If any API request fails, capture the server log, stack trace, and repro steps before moving on.

## 4. Claude Plugin Smoke Test
Confirm the bundled Claude Code plugin can harvest context, sync style, and prime memories without bypassing onboarding controls.

1. **Install fresh** – Start Claude Code in the repo root, run `/plugin marketplace add ./claude-plugin-marketplace`, then `/plugin install vib3-scribe-rush@vib3-scribe-rush-marketplace`. Restart Claude Code to load the commands.
2. **Enforce signup gating** – Attempt `/context-harvest` without a Vib3 session and confirm the flow halts, logging an entry via `POST /api/plugin-signups` with the operator’s email and `reason`.
3. **Run the memory loop** – Sign in to Vib3, execute `/context-harvest`, `/style-sync`, and `/memory-primer` in order, and confirm `GET /api/memory/primer` returns the new memories and recommended actions.
4. **Firebase replication (optional)** – If Firestore credentials or the emulator are configured, check for mirrored documents in `pluginSignups/` and `users/{userId}/claudeMemories` after running the commands.

Document the outcomes (screenshots, CLI output) so marketplace reviewers or internal QA can replay the same steps.

## 5. Release Procedure
1. Ensure `npm run build` has produced the client assets in `dist/`.
2. Run `npm run build --prefix server` to emit compiled server output into `server/dist`.
3. Deploy the contents of `dist/` (client) and `server/dist` (Node service) to the target environment.
4. Start the API with `npm run start --prefix server` (or the equivalent process manager command in production).
5. Verify the deployment by calling `https://<host>/auth/user` (should return the session snapshot or `{ isAuthenticated: false }`) and then smoke test the console via the public URL.
6. Enable monitoring for the `alerts` module destinations (Slack + PagerDuty) before announcing the release.

## 6. Post-Release Monitoring
- Track error rates from the server logger and confirm no auth callback or billing failures are spiking.
- Watch seat usage and integration sync jobs for the first 24 hours; adjust alert thresholds if they trigger unexpectedly.
- Collect feedback from the invited teammate to identify any gaps blocking general availability.

Keeping to this checklist ensures the shipped build reflects the existing functionality without introducing new surface area.
