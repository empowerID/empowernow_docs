---
title: API Reference
---

## POST /journal/v1/transcripts:upsert
Body
```
{
  "conversation_id": "uuid",
  "tenant_id": "t1",
  "agent_id": "agent:...",
  "user_id": "auth:account:...",
  "model": "gpt-4o-mini",
  "mode": "sanitized|balanced|raw",
  "messages": [
    { "role":"user", "content_masked":"...", "content_sha256":"...",
      "raw_fragments": {"subject":"<enc_ref>"}, "raw_blob_ref":"s3://...", "enc_key_ref":"kms:..." }
  ]
}
```
Response: `{ "ok": true, "persisted": N }`

## GET /journal/v1/coach/{user_id}/latest
Response: `{ "period_date":"YYYY-MM-DD","summary":"...","tips":[],"skills":[] }`

### See also
- Enforcement and consent: `services/bff/reference/BFF_PDP_Enforcement.md`

