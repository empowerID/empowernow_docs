# Security Model & Threat Assessment

## Model
- PATs authenticate end users; IdP stores salted hashes, not plaintext.
- BFF holds vendor keys and proxies requests; clients never see provider credentials.
- PDP evaluates authorization; budgets enforce usage limits; outage policy (LKG) as controlled fallback.

## Controls
- Introspection access control, rate limits, circuit breaker, caching.
- Header hygiene: strip inbound credentials/org headers; allowlist upstream headers.
- CSRF exemptions limited to machine endpoints; session auth for admin UIs.

## Threats & Mitigations
- PAT theft: short lifetimes, revocation, last-used monitoring, audit trail.
- Header abuse: strict header sanitation and pinning.
- IdP outage: breaker + retries; BFF degrades with LKG where safe.
- Provider outage: surface 5xx; alerting on error rates.

## Residual Risks
- LKG may allow limited stale decisions; documented and monitored.

## References
- `IdP/docs/PAT_Introspection_Hardening.md`
- `ServiceConfigs/BFF/config/README_Routing_Exposure.md`
