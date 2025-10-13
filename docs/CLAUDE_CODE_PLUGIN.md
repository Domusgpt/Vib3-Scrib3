# Claude Code Rush Plugin

The rush MVP plugin exposes a Claude-friendly surface so your Vib3 Scribe workspace can power Anthropic-driven coding and drafting flows. It is backed by the same chat, profile, and usage infrastructure as the core console and is secured by organization API keys.

## Getting Started
1. **Create an API key** under Workspace → API Keys with the scopes you need (`chat:write` is required for conversations, `profiles:read` and `profiles:write` unlock profile introspection and creation).
2. **Set the Anthropic key** in `server/.env` as `ANTHROPIC_API_KEY` so Claude can run tool calls.
3. **Point Claude Code** at the manifest endpoint: `https://<your-host>/api/claude-code/manifest.json`. Claude ingests the manifest, reads the OpenAPI schema, and can invoke routes automatically.
4. **Provide the API key** in each request using the `X-API-Key` header or a `Bearer` token so Vib3 Scribe can map the request to the proper organization.

## Endpoints
### `POST /api/claude-code/messages`
Run a single turn of conversation through the Anthropic provider. The plugin handles tool calls for fetching samples, creating profiles, or drafting in style.

```bash
curl -X POST https://localhost:3001/api/claude-code/messages \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
        "userId": "user_123",
        "prompt": "Draft a friendly welcome update for the product team.",
        "profileId": "profile_456"
      }'
```

### `GET /api/claude-code/profiles`
Fetch the style profiles available to a user so Claude can suggest the right tone.

```bash
curl -H "X-API-Key: sk_live_..." \
  "https://localhost:3001/api/claude-code/profiles?userId=user_123"
```

### `POST /api/claude-code/profiles/from-text`
Let Claude assemble a new profile from raw samples during onboarding.

```bash
curl -X POST https://localhost:3001/api/claude-code/profiles/from-text \
  -H "X-API-Key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
        "userId": "user_123",
        "profileName": "Product Announcements",
        "samples": "<paste your writing samples here>"
      }'
```

## Response Structure
All endpoints return structured JSON. Chat responses mirror the existing `ChatMessage` shape so the Claude Code integration can slot directly into the console history. Profile APIs return lightweight summaries that include the generated style text so Claude can reason about the tone without making extra calls.

## Error Handling
- **401 Unauthorized** – API key missing, revoked, expired, or lacking the required scopes.
- **403 Forbidden** – the user specified in the payload does not belong to the organization that issued the API key.
- **500 Internal Error** – unexpected server error; check the server logs for additional context.

## Rate & Usage Tracking
Every successful conversation turn calls the existing billing usage tracker so message counts stay consistent across the console, webhooks, and the Claude integration.

## Testing Tips
- Use sandbox Google access tokens (`sandbox:google`) to emulate Gmail sample counts without hitting the real API.
- Claude Code defaults to the Anthropic provider. If the environment variable is missing, the client falls back to Gemini and surfaces a system message in the UI.
