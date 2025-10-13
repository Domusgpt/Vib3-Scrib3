# Vib3 Scribe Rush Plugin

This Claude Code plugin packages the core launch workflows the Vib3 Scribe team needs to ship the MVP. Install it locally while you iterate, then publish it through your preferred marketplace when it's ready.

## Contents
- `/commands/release-pulse.md` – generates stakeholder-ready status summaries.
- `/commands/style-sync.md` – captures new voice profiles from writing samples.
- `/agents/launch-navigator.md` – facilitates cross-functional launch planning.
- `/hooks/hooks.json` – post-install and update nudges to keep the team aligned.

## Local Testing
1. `cd` into the repository root.
2. Add the bundled marketplace (see below) or point Claude Code directly at this plugin folder.
3. Restart Claude Code after installation so the commands register.

## Customisation Tips
- Duplicate command files to add more guided workflows.
- Extend `/agents` with additional facilitators for billing, integrations, or analytics war rooms.
- Add `/hooks` entries for `onMessage` or `onCommand` events to automate reminders.

For marketplace-driven installs, continue with the marketplace setup in `../claude-plugin-marketplace`.
