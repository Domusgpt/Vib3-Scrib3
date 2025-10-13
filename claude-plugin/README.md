# Vib3 Scribe Rush Plugin

This Claude Code plugin packages the core launch workflows the Vib3 Scribe team needs to ship the MVP while keeping Claude primed
with the user's writing memory and research context.

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
- Use `/context-harvest` first to gather fresh emails, posts, and docs. The command walks Claude through running **Deep Research**
  and persisting a `vib3-context-*` record via `POST /api/memory`.
- Follow with `/style-sync` to pull the active Vib3 Scribe profile via `GET /api/profiles/active`, reconcile it with the research,
  and save a `vib3-style-*` memory (including metadata like `profileId`) back through the same API.
- Run `/memory-primer` before writing to hit `GET /api/memory/primer`, check the stored memories against the live profile, and
  capture a working briefing that you can optionally store as a `briefing` memory.
- When shipping updates, run `/release-pulse` to create a status packet that references both memories.

## Customisation Tips
- Duplicate command files to add more guided workflows (e.g., partnership outreach, investor updates).
- Extend `/agents` with additional facilitators for billing, integrations, or analytics war rooms.
- Add `/hooks` entries for `onMessage` or `onCommand` events to automate reminders.

For marketplace-driven installs, continue with the marketplace setup in `../claude-plugin-marketplace`.
