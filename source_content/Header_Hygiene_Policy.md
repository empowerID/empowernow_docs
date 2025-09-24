# Header Hygiene Policy

## Inbound (from clients)
- Strip and never forward:
  - `Authorization`, `x-api-key`, `OpenAI-Organization`, `OpenAI-Project`, `Anthropic-Organization`
- Preserve allowlisted content headers (Content-Type, Accept) and tracing headers

## Upstream (to providers)
- Set server-held credentials only
- Set pinned org/project headers from configuration
- Add model/version headers where required by provider

## Rationale
- Prevent credential leakage and org/project drift
- Enforce a consistent, auditable upstream posture

## References
- `src/api/v1/endpoints/provider_proxies.py`
