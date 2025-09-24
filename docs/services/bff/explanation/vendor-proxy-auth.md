---
title: Vendor Proxy Authentication (PATs and JWTs)
---

The BFF accepts EmpowerNow PATs or JWTs on vendor proxy routes (e.g., OpenAI/Anthropic), resolves identity, enforces PDP/budgets, and emits receipts.

Flow
- Extract token from vendor‑native headers (e.g., `Authorization`, `x-api-key`)
- Classify: JWT (verify via IdP JWKS) vs PAT (introspect at IdP)
- Build identity‑first subject: `user_arn` and `agent:devtool:{client_id|generic}:{pairwise}`
- Enforce scopes (`llm:proxy:*`), PDP decision, egress allowlists, budget hold/settle
- Strip inbound secrets; use server‑held vendor keys

```mermaid
sequenceDiagram
  participant DevTool
  participant BFF
  participant IdP
  participant Vendor
  DevTool->>BFF: PAT or JWT
  alt PAT
    BFF->>IdP: PAT introspect
    IdP-->>BFF: identity‑first fields
  else JWT
    BFF->>IdP: JWKS verify
  end
  BFF->>Vendor: call with server key
  Vendor-->>BFF: response
  BFF-->>DevTool: result
```

See also
- PATs overview: `services/idp/explanation/pats-overview.md`
- PATs API: `services/idp/reference/pats-api.md`
- Troubleshooting: `Troubleshooting_PAT_Proxy.md`
- Dev tools setup: `Using_PAT_with_DevTools.md`

