# ARIA Shield — Artifacts Pack

## Gateway vs. Shield Diagram
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

## Links
- Matrix: `marketing/research/matrix/shield.md`
- Battlecard: `marketing/battlecards/shield.md`
- Shortlist: `marketing/research/shortlists/shield.md`
- SERP log: `marketing/research/serp/shield.csv`

## Velocity & Pricing Notes (snapshot)
- Curity Token Handler: enterprise; SPA cookies + gateway agent
- Kong Gateway: OSS + commercial; OIDC plugin + rate limiting
- NGINX: OSS + NGINX Plus; OIDC config + access controls

## Analyst/Market Notes
- OIDC at gateway secures sessions but lacks runtime governance primitives (budgets/402, streaming caps, receipts)
- Shield adds budget semantics, output caps, and cryptographic receipts while keeping tokens out of the browser

## Proof Hooks
- Budget exceed → HTTP 402 with deterministic UX and receipt
- Streaming caps enforced mid-stream with deny receipts
- Zero‑Token SPA: httpOnly cookies; tokens never reach browser; PDP evaluated per route
