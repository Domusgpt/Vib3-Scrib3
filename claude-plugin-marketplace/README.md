# Vib3 Scribe Rush Marketplace

This local Claude Code marketplace bundles the `vib3-scribe-rush` plugin for rapid MVP onboarding and automatic signup capture once operators request advanced Vib3 features.

## Usage
1. Launch Claude Code from the repository root.
2. Add the marketplace:
   ```shell
   /plugin marketplace add ./claude-plugin-marketplace
   ```
3. Install the plugin:
   ```shell
   /plugin install vib3-scribe-rush@vib3-scribe-rush-marketplace
   ```
4. Restart Claude Code to register the new commands, then run `/context-harvest`, `/style-sync`, and `/memory-primer` to prime Claude's memory (now backed by the `/api/memory` + `/api/memory/primer` endpoints). When someone hits these commands without an active Vib3 session the plugin records their email through `POST /api/plugin-signups` so you can complete onboarding before they access saved profiles.

> Tip: Flip on Firebase in `server/.env` to sync those signups and saved memories into Firestore for analytics or downstream automations—no need to weaken session security around the core API.

## Sharing with the Team
Commit this directory to the repo so trusted collaborators can enable it automatically via `.claude/settings.json` or their own marketplace listings.
