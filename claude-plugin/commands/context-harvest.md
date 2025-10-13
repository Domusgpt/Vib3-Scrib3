---
description: Prime Claude Code with deep research context from user communications.
---

# Vib3 Context Harvest

Use this when you need Claude to understand the user's current initiatives, tone, and priorities before drafting.

1. Confirm the operator has connected Gmail/Facebook in Vib3 Scribe. If not, direct them to `/integrations`.
2. Check sync health so you know what data is available:
   ```shell
   curl -s -H "Cookie: ${VIBE3_SESSION}" "http://localhost:3001/api/integrations/sample-count?source=gmail"
   ```
   Ask the operator to export or paste the latest emails, social posts, or docs they want Claude to study.
3. Run Claude's **Deep Research** across the provided artifacts to surface:
   - Active projects and deliverables.
   - Stakeholder names, roles, and preferences.
   - Tone shifts (formal vs casual) and key vocabulary.
4. Summarize the findings and store a memory named `vib3-context-${month}` containing:
   - Top initiatives and owners.
   - Recurrent phrases or sign-offs.
   - Links to or filenames of the research set.
5. Share a short briefing (3–5 bullets) for the operator plus recommended prompts they can reuse in Claude Code.
6. Suggest refreshing this context weekly or whenever major projects change.
7. Hand off to `/memory-primer` so the operator can reconcile the stored memories with the latest Vib3 profile before drafting.

Always respect the user's privacy settings and follow internal data-handling policies when storing context in Claude's memory.
