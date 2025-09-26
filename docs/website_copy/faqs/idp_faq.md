# FAQ — IdP (Agent Passports)

## How are Agent Passports different from OAuth access tokens?
Passports are purpose‑bound via RAR, use pairwise subjects, can embed plan contracts and schema pins, and can be bound with DPoP for proof‑of‑possession. Standard access tokens typically lack these guarantees.

## Do we need DPoP?
Optional. Use DPoP where proof‑of‑possession materially reduces risk (e.g., sensitive tools). Otherwise start with Bearer + pairwise subjects and add DPoP later.

## How does identity chaining work?
Two flows: delegated assertion (mint an Identity Assertion) and brokered exchange (swap at a SaaS Authorization Server). Both are gated by PDP constraints (`identity_chain`).

## What is the impact on latency?
Issuance happens off the critical tool path. Runtime checks occur at PEPs (Shield/MCP) and are cache‑friendly (TTL from PDP).

## How do we migrate away from API keys?
Start by issuing Passports for two critical flows. Replace shared keys in CI/code first, then expand. Add RAR scopes, then actor chains, then pins.

## How do schema pins roll out safely?
Pins `{version,hash}` support CURRENT + grace windows. Clients can accept both CURRENT and NEXT during rollout.

## What standards are supported?
OAuth Token Exchange (RFC 8693), RAR (RFC 9396), optional DPoP (RFC 9449), OIDC/JWKS.

## Where do receipts come from?
PEPs (ARIA Shield, ARIA MCP Gateway) emit signed, hash‑chained receipts on permit, linking policy snapshot and pin hashes.

## See also
- `/docs/services/idp/index.md`
- `/docs/services/idp/reference/token-exchange.md`
- `/docs/services/aria-shield/reference/receipts.md`
