# Vib3 Scribe Rush Marketplace

This local Claude Code marketplace bundles the `vib3-scribe-rush` plugin for rapid MVP onboarding.

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
4. Restart Claude Code to register the new commands, then run `/context-harvest` followed by `/style-sync` to prime Claude's memory before `/release-pulse`.

## Sharing with the Team
Commit this directory to the repo so trusted collaborators can enable it automatically via `.claude/settings.json` or their own marketplace listings.
