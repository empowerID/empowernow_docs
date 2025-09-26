# ARIA Shield — Competitor Shortlist and SERP Seed

Focus: Zero‑Token SPA, budgets (HTTP 402), streaming caps, cryptographic receipts, PDP route mapping.

## Shortlist
- Curity Token Handler — SPA cookies + gateway agent pattern
- Kong Gateway + OIDC — OIDC plugin; traffic control
- NGINX + OIDC — reverse proxy + OIDC config
- Cloudflare Gateway (adjacent) — filters/controls (no budgets/receipts)

## Diagram — SPA/BFF vs Gateway OIDC
```mermaid
flowchart LR
  subgraph OIDC_GW[Typical OIDC Gateway]
    U[User] --> SPA
    SPA --> G[Gateway]
    G -->|OIDC| IdP
    G --> API
  end

  subgraph SHIELD[ARIA Shield]
    U2[User] --> SPA2
    SPA2 --> BFF[Shield BFF]
    BFF -->|AuthZ| PDP
    BFF -->|stream caps + budgets (402)| API2
    BFF --> Vault[(Receipts)]
  end
  OIDC_GW --> SHIELD
```

## Notes
- Competitors JSON: `marketing/research/competitors/shield/`
- SERP log: `marketing/research/serp/shield.csv`
