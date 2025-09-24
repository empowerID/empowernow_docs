# Proxy API Reference (BFF → OpenAI/Anthropic)

```mermaid
sequenceDiagram
  participant Tool as Dev Tool (Cursor/SDK)
  participant BFF
  participant IdP
  participant Provider as OpenAI/Anthropic
  Tool->>BFF: PAT in vendor header (Authorization/x-api-key)
  BFF->>IdP: Introspect PAT
  IdP-->>BFF: subject ARN, pairwise, scopes
  BFF->>Provider: Upstream call with server-held key (headers pinned)
  Provider-->>BFF: Response/Stream
  BFF-->>Tool: Response/Stream
```

## Base URLs
- OpenAI-compatible: `https://<bff-host>/proxy/openai/v1`
- Anthropic-compatible: `https://<bff-host>/proxy/anthropic/v1`

## Authentication
- Use an IdP-issued PAT in the vendor-native header:
  - OpenAI: `Authorization: Bearer <PAT>`
  - Anthropic: `x-api-key: <PAT>`
- The BFF performs PAT introspection with the IdP and rejects invalid or revoked tokens.

### Single-tenant note
- Deployments are single-tenant. `tenant_id` is derived server-side as an instance label (config), not sent by clients. It may appear in logs/responses for audit/debug only.

## Paths
- OpenAI-compatible
  - `POST /chat/completions` (streaming supported)
  - `POST /embeddings`
  - `POST /images/*` (if enabled)
- Anthropic-compatible
  - `POST /messages` (streaming supported)

## Request header hygiene (inbound stripped)
- Authorization/x-api-key (vendor) are not forwarded upstream.
- Organization/project headers (OpenAI/Anthropic) are removed; the BFF pins org/project via server config.
- Non-allowlisted headers are dropped.

## Streaming
- Server-Sent Events and chunked transfer are transparently proxied. Expect identical stream shapes to the provider SDKs.

## Error codes
- 401 Unauthorized: Missing/invalid PAT
- 403 Forbidden: Policy denial (PDP) or budget rejection
- 409 Conflict: Duplicate/invalid request sequencing
- 429 Too Many Requests: Rate limit (provider or BFF introspection)
- 5xx: Upstream/provider or transient infrastructure errors

## Model alias normalization
- The BFF may map incoming model aliases to canonical models per environment config. See `services/providers/registry.py`.

## Org/Project pinning
- Client-specified org/project headers are ignored. Org/project selection is centrally configured in the BFF and auditable.

## Observability
- Metrics include PAT introspection counts, limits, circuit breaker status, proxy latencies, streaming cancellations, and upstream error rates.

## Examples
- See `Developer_Quickstart_PAT_Proxy.md` for cURL and SDK snippets.

### Postman-friendly cURL

OpenAI-compatible (chat completions):
```bash
curl -sS \
  -H 'Authorization: Bearer aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/openai/v1/chat/completions
```

Anthropic-compatible (messages):
```bash
curl -sS \
  -H 'x-api-key: aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -H 'anthropic-version: 2023-06-01' \
  -d '{"model":"claude-3-opus-20240229","max_tokens":64,"messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/anthropic/v1/messages
```
