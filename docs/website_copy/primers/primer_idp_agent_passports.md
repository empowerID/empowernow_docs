# Primer — Agent Passports & Token Exchange

## What it is

Purpose-bound, pairwise credentials for humans and AI agents issued via OAuth Token Exchange (RFC 8693) with Rich Authorization Requests (RFC 9396) and optional DPoP (RFC 9449).

## Why it matters

- Replace shared keys with least‑privilege, provable identities
- Make delegation explicit (actor chains) and audit‑ready
- Align identity for agents and humans under open standards

## How it works

```mermaid
flowchart LR
  U[User/Service] --> TE[Token Exchange]
  TE --> P[Agent Passport]
  P --> PEP[PEP (Shield/MCP)]
  PEP --> PDP[AuthZEN]
  PEP --> R[Receipt]
```

1) Exchange subject token for Passport with RAR (purpose)
2) Encode pairwise subject, optional DPoP, plan + schema pins
3) PEP validates Passport, calls PDP; on permit emits receipt

## Pitfalls to avoid

- Treating scopes as purpose — use RAR objects instead
- Reusing global subjects — use pairwise `sub` per audience
- Skipping plan/schema pins — lose integrity guarantees

## See also

- `/docs/services/idp/index.md`
- `/docs/services/idp/reference/token-exchange.md`
- `/docs/services/aria-shield/reference/receipts.md`
