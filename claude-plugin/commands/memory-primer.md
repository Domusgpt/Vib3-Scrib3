---
description: Recall stored Vib3 context + style memories before drafting.
---

# Vib3 Memory Primer

Use this after `/context-harvest` and `/style-sync` so Claude Code always writes with the freshest facts and tone.

1. Open Claude Code's **Memory** panel (or run `/remember list`) to confirm `vib3-context-*` and `vib3-style-*` memories exist. Capture their timestamps.
2. If either memory is missing or older than 7 days, run the corresponding command to refresh it before continuing.
3. Fetch the active Vib3 Scribe profile for comparison:
   ```shell
   curl -s -H "Cookie: ${VIBE3_SESSION}" http://localhost:3001/api/profiles/active
   ```
   Note any deltas between the stored profile traits and the memory summaries.
4. Ask Claude to restate the combined memory highlights in 5 bullets covering:
   - Current initiatives + stakeholders (from `vib3-context-*`).
   - Voice, pacing, and personalization rules (from `vib3-style-*`).
   - Phrases or sign-offs to reuse.
   - Links or docs that should be referenced when drafting.
   - Open questions or gaps to investigate.
5. Save the refreshed briefing into the chat (or a scratchpad) and keep it pinned for subsequent prompts.
6. Remind the operator that any major copy changes should be pushed back to Vib3 Scribe via `POST /api/profiles` so the product and Claude stay aligned.

Finish by acknowledging whether the stored memories are current or if a refresh was scheduled.
