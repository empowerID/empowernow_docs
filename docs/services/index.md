# Services

This section documents each EmpowerNow service. Where applicable, both frontend and backend are covered.

See also: `services/identity-fabric/index` for a suite‑level overview and architecture diagram.

## What you get

- ARIA Shield (Gateway): one secure front door; allow/deny with reasons; budget checks; SIEM logs; no browser tokens
- Authorization (PDP): OpenID AuthZEN; obligations & budgets; break‑glass and kill switches
- Authentication (IdP): short‑lived, scoped tokens; works with Okta & Microsoft Entra ID
- Automation Studio: no‑code connectors as MCP Tools; per‑run policy; approvals, budgets, receipts; secrets via CyberArk/Vault
- Inventory: no‑code inventory connectors; continuous discovery; feeds SailPoint/EmpowerID
- Receipts: signed, hash‑chained audit records with plan/data/budget diffs and anchors