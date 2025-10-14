---
description: Recall stored Vib3 context + style memories before drafting.
---

# Vib3 Memory Primer

Use this after `/context-harvest` and `/style-sync` so Claude Code always writes with the freshest facts and tone.

1. Call the Vib3 memory primer API to retrieve the latest stored context, style memories, and recommended actions:
   ```shell
   curl -s -H "Cookie: ${VIBE3_SESSION}" http://localhost:3001/api/memory/primer | jq
   ```
   Note the `statuses` field to see if either memory is stale or missing.
2. If either memory is missing or flagged as `stale`, immediately run `/context-harvest` or `/style-sync` before drafting.
3. Fetch the active Vib3 Scribe profile for comparison (included in the primer response, but you can also call the endpoint directly if needed):
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
5. Save the refreshed briefing into Vib3 so the next Claude session can grab it instantly:
   ```shell
   curl -s -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: ${VIBE3_SESSION}" \
     http://localhost:3001/api/memory \
     -d @- <<'JSON'
   {
     "category": "briefing",
     "title": "vib3-briefing-${$(date +%Y%m%d)}",
     "summary": "${primerSummary}",
     "highlights": ${jsonBullets}
   }
   JSON
   ```
   Swap `${jsonBullets}` for a JSON array of your briefing bullets (or `[]`) and keep the same bullets handy in chat for fast copy/paste access.
6. Remind the operator that any major copy changes should be pushed back to Vib3 Scribe via `POST /api/profiles` so the product and Claude stay aligned.
7. If they want ongoing access to the saved memories or premium automations, transition to `/account-handoff` so their signup intent is logged before enabling custom tooling.

Finish by acknowledging whether the stored memories are current or if a refresh was scheduled, and whether the handoff was captured.
