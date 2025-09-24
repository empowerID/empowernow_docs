# Troubleshooting: PAT Proxy

## Quick checks
- PAT format: `aria_pat_*` and not expired/revoked
- Base URL set to BFF proxy (`/proxy/openai/v1` or `/proxy/anthropic/v1`)
- Using vendor-native header (Authorization Bearer or x-api-key)

## Common errors
- 401 Unauthorized
  - Wrong header or malformed PAT
  - Introspection client not allowed → check IdP `clients.yaml` and BFF logs
- 403 Forbidden
  - PDP policy denial or budget exceeded → check policy and budgets
- 429 Too Many Requests
  - Provider or IdP introspection rate limiting → backoff and retry
- Circuit open
  - IdP introspection breaker is open; see BFF/IdP metrics and logs

## How to confirm PAT validity
- Call IdP introspection (service credentials required):
```bash
curl -u service-client:secret1 \
  -H 'Content-Type: application/json' \
  -d '{"token":"aria_pat_..."}' \
  https://idp.ocg.labs.empowernow.ai/api/oauth/pat/introspect
```

## Logs & Metrics
- BFF: PAT introspect counters, circuit open events, proxy latencies
- IdP: issue/list/revoke logs, introspect rate-limit and cache stats

## Streaming issues
- Ensure client supports SSE/chunked; proxies/firewalls can buffer → test via curl

## Contact
- Include request id, timestamp, model, provider path, and error code when opening a ticket.
