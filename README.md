# Vib3-Scribe Claude Plugin

Vib3-Scribe is the Parserator ecosystem companion from Clear Seas Solutions and Paul Phillips. Install the plugin inside Claude Code to spin up the same launch playbooks we use for Parserator betas—Vib3-Scribe for composition, Nimbus-Guardian for incident intelligence, and Reposiologist for institutional memory.

---

## What you get

- **On-demand rollout guide** – `/vib3-scribe` walks teams through environment prep, style ingestion, governance sign-off, and launch metrics in the order we run internal cutovers.
- **Parserator ecosystem signals** – The command highlights when to loop in Nimbus-Guardian monitoring and Reposiologist archives so launches stay audit-ready.
- **House tone, zero filler** – Responses are tuned to the confident, pragmatic Vib3-Scribe voice—no chirpy bot copy, just the enablement steps and follow-ups that matter.

---

## Install the plugin locally

1. Clone or download this repository.
2. Start Claude Code from the repository root.
3. Add the local Parserator marketplace:
   ```bash
   /plugin marketplace add ./
   ```
4. Install Vib3-Scribe:
   ```bash
   /plugin install vib3-scribe@parserator-betas
   ```
5. Restart Claude Code if prompted, then run `/vib3-scribe`.

> **Tip:** Keep the repository synced with `main` so you receive updates to the rollout checklist as the beta matures.

---

## Command reference

### `/vib3-scribe`

The primary command delivers a structured briefing:

1. Greets the user in the Vib3-Scribe tone and confirms objectives.
2. Maps the request to one of three Parserator tracks—creative console, compliance, or integrations.
3. Provides a sequenced checklist (environment readiness, console configuration, launch metrics) with clear ownership.
4. Flags cross-product hooks into Nimbus-Guardian and Reposiologist when they improve governance or insight.
5. Closes with next steps, documenting any open questions for Paul Phillips.

Use the command whenever you need to orient a teammate, customer, or partner on where their Parserator rollout stands and what comes next.

---

## Repository layout

```
.claude-plugin/      # Claude manifests for the local Parserator marketplace and plugin metadata
commands/            # Markdown definitions for available slash commands (currently /vib3-scribe)
server/, pages/, ... # The reference Vib3-Scribe application codebase this plugin promotes
```

The application source remains so you can demo or extend the web console alongside the plugin experience.

---

## Support

Questions, integrations, or approval gates should go straight to Paul Phillips at Clear Seas Solutions. Mention the workspace and Parserator track you are supporting so we can slot you into the correct beta channel.
