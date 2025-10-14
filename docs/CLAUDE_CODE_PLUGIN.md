# Claude Code Plugin Quickstart for Vib3 Scribe

Use this guide to spin up the rush MVP plugin that mirrors the official Claude Code plugin workflow. It follows Anthropic's reference structure so you can distribute commands, agents, hooks, and (later) MCP servers without touching the core app.

## 1. Prerequisites
- Claude Code installed locally.
- Vib3 Scribe repository cloned and dependencies installed.
- Basic CLI familiarity.

## 2. Marketplace + Plugin Layout
The repo now ships with a local marketplace and plugin:

```
claude-plugin/
  .claude-plugin/plugin.json
  commands/
  agents/
  hooks/
claude-plugin-marketplace/
  .claude-plugin/marketplace.json
```

`claude-plugin` hosts the rush MVP automation (commands + agent). `claude-plugin-marketplace` wraps it in a marketplace so you can install it with `/plugin marketplace add`.

## 3. Install Locally
1. Start Claude Code from the repository root.
2. Register the marketplace:
   ```shell
   /plugin marketplace add ./claude-plugin-marketplace
   ```
3. Install the plugin:
   ```shell
   /plugin install vib3-scribe-rush@vib3-scribe-rush-marketplace
   ```
4. Restart Claude Code. The `/context-harvest`, `/style-sync`, `/memory-primer`, and `/release-pulse` commands plus the `Launch Navigator` agent will now appear in `/help`.

## 4. Memory-First Workflow
To honor the user's writing style with up-to-date context:
1. Run `/context-harvest` to collect the freshest communications (emails, posts, docs), trigger Claude's Deep Research workflow, and persist a `vib3-context-*` record via `POST /api/memory`. If the operator lacks a Vib3 session, the command records their email with `POST /api/plugin-signups` (`reason: memory-access`) so GTM can finish onboarding.
2. Run `/style-sync` to pull the active Vib3 Scribe profile via `GET /api/profiles/active`, reconcile it with the research set, and push a `vib3-style-*` memory (with metadata like `profileId`) through the same endpoint. Missing sessions get captured as `reason: profile-sync` signups.
3. Run `/memory-primer` to fetch `GET /api/memory/primer`, verify the stored memories are current, and capture a working briefing (optionally stored as a `briefing` memory). This command pauses and logs signup interest if the session cookie is absent.
4. Use `/release-pulse` or custom prompts that reference those memories so Claude drafts in the exact tone and with the latest facts. It also double-checks that onboarding is complete before sharing stored context.

## 5. Memory API Quick Reference

The rush plugin now leans on first-party endpoints to persist and retrieve Claude-ready memories:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/memory` | Save context, style, or briefing memories for the authenticated user. |
| `GET /api/memory?category=context` | Retrieve stored memories (optionally filtered by category/limit). |
| `GET /api/memory/primer` | Return the freshest context + style memory pair, active profile info, and recommended refresh actions. |
| `GET /api/profiles/active` | Resolve the active profile (falling back to the newest profile when none is selected). |
| `POST /api/plugin-signups` | Capture emails + intent when operators request advanced features without an account. |

### Firebase replication (optional)

Need to share signup intent or saved memories with other tooling (or Claude itself) without poking holes in session auth? Configure
Firebase credentials in `server/.env` and the platform will mirror plugin signups into `pluginSignups/{source__emailHex}` and
user memories into `users/{userId}/claudeMemories/{memoryId}` collections. Supported environment variables:

```
FIREBASE_PROJECT_ID=<firebase-project>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# or set FIREBASE_CREDENTIALS_JSON={...}
FIREBASE_EMULATOR_HOST=localhost:8080  # optional for local testing
```

With Firebase disabled, the API falls back to the bundled lowdb store—no changes required for local development.

Example payload for storing a context memory:

```shell
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: ${VIBE3_SESSION}" \
  http://localhost:3001/api/memory \
  -d '{
    "category": "context",
    "title": "vib3-context-2024-06",
    "summary": "Top launches, leads, and risks pulled from Deep Research.",
    "highlights": [
      "Ops insights console launches 6/30",
      "PagerDuty integration pending security sign-off"
    ]
  }'
```

These endpoints allow Claude to keep long-lived memory without manual copy/paste while respecting Vib3's session auth and capturing signup demand for advanced tooling.

## 6. Monitor Claude plugin demand

Once the platform builds succeed, open the "Claude Plugin Operations" console at `/plugin-ops` to review signup momentum before publishing:

- **Summary tiles** surface total captured emails, multi-touch accounts, and the most recent touch timestamp so you know whether onboarding requests are accelerating.
- **Reason breakdowns** show how often operators ask for memory access, profile sync, or advanced tools—use this to prioritize follow-ups.
- **Signup journal** lists the raw touches (reason, captured command, notes) with filters for time window and reason. It relies on the authenticated `GET /api/plugin-signups` endpoint you just added, so only trusted operators can view the data.

Refresh this view during QA to confirm the plugin is capturing interest and syncing to Firebase (if enabled) before you list it in an external marketplace.

## 7. Extend the Plugin
- Add more commands under `claude-plugin/commands/` for billing, analytics, or integration drills.
- Create new agents in `claude-plugin/agents/` to lead retros or postmortems.
- Add hook automation in `claude-plugin/hooks/hooks.json` (e.g., onboarding reminders).
- Introduce MCP servers by dropping a `.mcp.json` file in the plugin root following Anthropic's reference docs.

## 8. Team Rollout
For automatic installs:
1. Commit this repo to your shared workspace.
2. Add the marketplace path to `.claude/settings.json` in the project root.
3. Ask teammates to trust the folder in Claude Code—the plugin will install on launch.

## 9. Publishing Checklist
- Update `plugin.json` with your homepage, support email, and version bumps.
- Document usage in `claude-plugin/README.md`.
- Optionally point the marketplace `source` to a git tag or package registry before sharing externally.
- Before sharing broadly, dry-run `/context-harvest`, `/style-sync`, and `/memory-primer` locally without a Vib3 session to verify signup capture, then repeat the sequence with a valid session cookie to confirm memories persist and surface through `GET /api/memory/primer`.

Need more? Dive into Anthropic's [Plugins reference](https://docs.anthropic.com/en/docs/claude-code/plugins-reference) and [Plugin marketplaces](https://docs.anthropic.com/en/docs/claude-code/plugin-marketplaces) for the full schema.
