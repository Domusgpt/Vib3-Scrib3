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
4. Restart Claude Code. The `/release-pulse` and `/style-sync` commands plus the `Launch Navigator` agent will now appear in `/help`.

## 4. Extend the Plugin
- Add more commands under `claude-plugin/commands/` for billing, analytics, or integration drills.
- Create new agents in `claude-plugin/agents/` to lead retros or postmortems.
- Add hook automation in `claude-plugin/hooks/hooks.json` (e.g., onboarding reminders).
- Introduce MCP servers by dropping a `.mcp.json` file in the plugin root following Anthropic's reference docs.

## 5. Team Rollout
For automatic installs:
1. Commit this repo to your shared workspace.
2. Add the marketplace path to `.claude/settings.json` in the project root.
3. Ask teammates to trust the folder in Claude Code—the plugin will install on launch.

## 6. Publishing Checklist
- Update `plugin.json` with your homepage, support email, and version bumps.
- Document usage in `claude-plugin/README.md`.
- Optionally point the marketplace `source` to a git tag or package registry before sharing externally.

Need more? Dive into Anthropic's [Plugins reference](https://docs.anthropic.com/en/docs/claude-code/plugins-reference) and [Plugin marketplaces](https://docs.anthropic.com/en/docs/claude-code/plugin-marketplaces) for the full schema.
