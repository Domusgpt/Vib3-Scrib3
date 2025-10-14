---
description: Capture a new Vib3 Scribe voice profile from app data + deep research.
---

# Vib3 Scribe Style Sync

Goal: make Claude Code mimic the user's authentic voice by blending their saved Vib3 Scribe profile with any new context you deep-research.

Steps:
1. Verify the operator already has a valid Vib3 account session (`VIBE3_SESSION`). If they do not, collect their preferred onboarding email and register it so the team can provision access before proceeding:
   ```shell
   read -p "Preferred email for Vib3 access: " vib3_email
   curl -s -X POST \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/plugin-signups \
     -d "{\"email\": \"${vib3_email}\", \"reason\": \"profile-sync\", \"command\": \"/style-sync\"}"
   ```
   Inform them that saved profile APIs unlock after the account handshake, then stop the workflow until they're provisioned.
2. Call the Vib3 Scribe API to load the active profile:
   ```shell
   curl -s -H "Cookie: ${VIBE3_SESSION}" http://localhost:3001/api/profiles/active
   ```
   If no active profile exists, fall back to `/api/profiles` and ask the user which one to use.
3. Read the profile summary, rules, and sample snippets returned by the API. Summarize the must-keep traits.
4. Ask the user to provide three fresh writing samples (e.g., recent emails or memos) plus any phrases or sign-offs they want to preserve.
5. Run Claude's **Deep Research** over the provided material to extract situational facts, audience needs, and any constraints or success metrics.
6. Save the blended profile back to Vib3 using the Claude memory API so every Claude session can recall it:
   ```shell
   curl -s -X POST \
     -H "Content-Type: application/json" \
     -H "Cookie: ${VIBE3_SESSION}" \
     http://localhost:3001/api/memory \
     -d @- <<'JSON'
   {
     "category": "style",
     "title": "vib3-style-${profileName}",
     "summary": "${twoSentenceAbstract}",
     "highlights": ${jsonBulletRules},
     "metadata": {
       "profileId": "${activeProfileId}",
       "source": "deep_research",
       "refreshedAt": "$(date -Iseconds)"
     }
   }
   JSON
   ```
   Replace `${jsonBulletRules}` with a JSON array of the guardrails you captured so Claude can echo critical phrases verbatim later.
7. Produce the final output containing:
   - A profile name and 2–3 sentence abstract updated with new insights.
   - Bullet rules for voice, cadence, formatting, taboo phrases, and personalization hooks.
   - A ready-to-use onboarding checklist for teammates syncing the voice to the app and plugin.
   - A confirmation that the memory and deep research context are stored for reuse.

Close by reminding the operator to update the Vib3 Scribe workspace profile via `POST /api/profiles` so future sessions stay in sync with Claude Code's memory and to run `/memory-primer` before the next drafting session.
