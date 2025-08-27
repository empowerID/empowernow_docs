# Product — Tool Registry

## Overview
The Tool Registry is a catalog of MCP/HTTP tools that enables verifiable request shaping. It provides hash‑pinned interfaces to tools so the control plane can enforce schema integrity with safe rollouts.

## CURRENT/pin semantics
- Each tool has exactly one CURRENT version
- Pins include `{ schema_version, schema_hash }` computed from canonical JSON
- Rollout grace windows allow accepting the previous version for a limited time
- ETag on GET responses enables conditional GETs (`If-None-Match`) to reduce load

## Read endpoints (hot path)
- `GET /tools/{tool_id}` → `{ id, endpoint, schema_version, schema_hash, previous_version, previous_hash, updated_at, grace_seconds, risk_tier, auth_mode, cost_per_call }`
  - Headers: `ETag`, `Cache-Control: public, max-age=60`
- `HEAD /tools/{tool_id}` → ETag/Cache-Control headers
- `GET /tools/{tool_id}/pin` or `/pins/{tool_id}` → minimal pin payload
  - `?format=jws` returns a compact JWS when signing is configured

## Admin flows (write path)
- `POST /tools` → create tool (auth required)
- `POST /tools/{tool_id}/versions` → add a version (schema + endpoint); optional activate
- `POST /tools/{tool_id}/rollout` → flip CURRENT to a specific version atomically

## Signed pin (optional)
- Configure a signing key to produce pin JWS tokens
- IdP can embed signed pins in Passports or Receipts can include the pin for audit

## Why it matters
- Prevents schema “shape drift” by pinning tool contracts
- Enables safe version flips without breaking agents (grace windows)
- Caches efficiently on the read path (ETag) for high QPS

CTAs: See pin format → Read admin guide → View ETag example
