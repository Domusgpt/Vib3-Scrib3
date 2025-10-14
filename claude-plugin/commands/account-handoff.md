---
description: Capture signup intent after the memory primer so Vib3 can onboard the operator.
---

# Vib3 Account Handoff

Use this when the operator wants to keep using saved profiles, analytics, or custom automations beyond the rush plugin flows.

1. Confirm they have run `/memory-primer` and understand the stored context + style memories.
2. Ask for the best email (and optional name) to tie the memories back to their Vib3 workspace.
3. Record the signup request:
   ```shell
   curl -s -X POST \
     -H "Content-Type: application/json" \
     http://localhost:3001/api/claude/signups \
     -d @- <<'JSON'
   {
     "email": "${email}",
     "name": "${name}",
     "intent": "Persistent access to Vib3 memories + tools",
     "stage": "memory_access_requested",
     "command": "account-handoff",
     "metadata": {
       "requestedBy": "${operatorSlackHandle}",
       "context": "${summaryOfNeeds}"
     }
   }
   JSON
   ```
4. Let them know the team will send a formal onboarding link—no manual setup required on their side.
5. Drop a quick recap for the Vib3 team including:
   - What workflows resonated (harvest, style sync, release pulse, etc.).
   - Any blockers preventing immediate adoption.
   - Priority level for onboarding (e.g., warm lead, urgent launch).
6. Remind the operator that once they sign in, Vib3 Scribe automatically migrates their memories and unlocks API keys, webhooks, and audits.

Log every request so growth and success can prioritise outreach without digging through Claude transcripts.
