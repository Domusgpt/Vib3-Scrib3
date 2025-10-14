# Vib3 Scribe Rush Plugin

This Claude Code plugin packages the core launch workflows the Vib3 Scribe team needs to ship the MVP while keeping Claude primed with the user's writing memory and research context. It now captures post-exploration signups so anyone who wants to unlock saved profiles or memories can be onboarded into Vib3 Scribe.

## Contents
- `/commands/context-harvest.md` – primes Claude with deep-researched context from synced communications.
- `/commands/release-pulse.md` – generates stakeholder-ready status summaries.
- `/commands/style-sync.md` – blends saved profiles with new samples and stores a reusable memory.
- `/commands/memory-primer.md` – replays saved memories and checks they still match the latest Vib3 profile.
- `/agents/launch-navigator.md` – facilitates cross-functional launch planning.
- `/hooks/hooks.json` – post-install and update nudges to keep the team aligned.

## Local Testing
1. `cd` into the repository root.
2. Add the bundled marketplace (see below) or point Claude Code directly at this plugin folder.
3. Restart Claude Code after installation so the commands register.

## Memory + Research Workflow
- Use `/context-harvest` first to gather fresh emails, posts, and docs. The command walks Claude through running **Deep Research** and persisting a `vib3-context-*` record via `POST /api/memory`. If the operator isn't authenticated yet, Claude records their email via `POST /api/plugin-signups` (`reason: "memory-access"`) so the team can provision access before saving memories.
- Follow with `/style-sync` to pull the active Vib3 Scribe profile via `GET /api/profiles/active`, reconcile it with the research, and save a `vib3-style-*` memory (including metadata like `profileId`) back through the same API. The command captures missing accounts with `reason: "profile-sync"` so you know who wants the full experience.
- Run `/memory-primer` before writing to hit `GET /api/memory/primer`, check the stored memories against the live profile, and capture a working briefing that you can optionally store as a `briefing` memory. When access is missing, the command records the email with `reason: "memory-access"` and pauses until onboarding is complete.
- When shipping updates, run `/release-pulse` to create a status packet that references both memories. It also double-checks that the operator has an authenticated session and logs any new signup interest.

## Signup capture API
- `POST /api/plugin-signups` accepts `{ email, reason, command, note?, metadata? }` payloads and stores them in Vib3's database.
- Reasons include `memory-access`, `profile-sync`, `advanced-tools`, and `other` for bespoke requests.
- Every command in this plugin calls this endpoint when a session cookie is missing so your GTM team can follow up and finish onboarding.

### Optional Firebase backend
Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `server/.env` to store Claude memories and plugin signup touches in Firestore instead of the local LowDB JSON. This lets you reuse Firebase Auth, security rules, and dashboards without changing the command flow.

## Customisation Tips
- Duplicate command files to add more guided workflows (e.g., partnership outreach, investor updates).
- Extend `/agents` with additional facilitators for billing, integrations, or analytics war rooms.
- Add `/hooks` entries for `onMessage` or `onCommand` events to automate reminders.

For marketplace-driven installs, continue with the marketplace setup in `../claude-plugin-marketplace`.
