---
title: Architecture
---

Hybrid edge architecture verified in BFF docs.

```mermaid
flowchart LR
  Browser -->|Cookie| Traefik
  Traefik -->|/auth/verify| BFF
  BFF -->|lookup| Redis
  BFF <-->|OIDC| IdP
  BFF -->|Bearer| Services
```
