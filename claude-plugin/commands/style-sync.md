---
description: Capture a new Vib3 Scribe voice profile from app data + deep research.
---

# Vib3 Scribe Style Sync

Goal: make Claude Code mimic the user's authentic voice by blending their saved Vib3 Scribe profile with any new context you deep-research.

Steps:
1. Call the Vib3 Scribe API to load the active profile:
   ```shell
   curl -s -H "Cookie: ${VIBE3_SESSION}" http://localhost:3001/api/profiles/active
   ```
   If no active profile exists, fall back to `/api/profiles` and ask the user which one to use.
2. Read the profile summary, rules, and sample snippets returned by the API. Summarize the must-keep traits.
3. Ask the user to provide three fresh writing samples (e.g., recent emails or memos) plus any phrases or sign-offs they want to preserve.
4. Run Claude's **Deep Research** over the provided material to extract situational facts, audience needs, and any constraints or success metrics.
5. Store a memory named `vib3-style-${profileName}` with:
   - The key tone descriptors from the API.
   - Signature phrases or formatting patterns from the user samples.
   - Links or references to the research artifacts you used.
   Use `/remember` if prompted, or rely on Claude Code's memory sidebar when available.
6. Produce the final output containing:
   - A profile name and 2–3 sentence abstract updated with new insights.
   - Bullet rules for voice, cadence, formatting, taboo phrases, and personalization hooks.
   - A ready-to-use onboarding checklist for teammates syncing the voice to the app and plugin.
   - A confirmation that the memory and deep research context are stored for reuse.

Close by reminding the operator to update the Vib3 Scribe workspace profile via `POST /api/profiles` so future sessions stay in sync with Claude Code's memory.
