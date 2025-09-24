---
title: Enable Masked Journaling
---

## Goal
Persist masked prompts with minimal risk; emit sanitized events for analytics.

## Steps
1) In BFF, after preflight redaction and consent checks, upsert masked messages via Journal API.
2) Ensure failures do not affect the request path (non‑blocking).

Request (example)
```
POST /journal/v1/transcripts:upsert
{ "conversation_id":"...", "tenant_id":"...", "agent_id":"...", "user_id":"...",
  "model":"gpt-4o-mini", "messages":[{"role":"user","content_masked":"...","content_sha256":"..."}] }
```

## Verify
- Check DB rows inserted and sanitized events flowing to ClickHouse.

## See also
- BFF enforcement: `services/bff/reference/BFF_PDP_Enforcement.md`

