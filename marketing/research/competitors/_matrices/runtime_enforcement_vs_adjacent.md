### ARIA Shield Runtime Enforcement vs Competitors

| Vendor | Category | Budget Enforcement | 402 Semantics | Streaming Caps | Cryptographic Receipts | PDP Route Mapping |
|---|---|---:|---:|---:|---:|---:|
| ARIA Shield | Shield | Yes | Yes | Yes | Yes | Yes |
| Curity Token Handler | Shield | No | No | No | No | Yes |
| Kong Gateway + OIDC | Shield | No | No | No | No | Yes |
| NGINX (Gateway) + OIDC | Shield | No | No | No | No | Yes |
| Cloudflare AI Gateway | MCPGateway | No | No | No | No | No |
| Portkey | MCPGateway | No | No | No | No | No |
| Helicone | MCPGateway | No | No | No | No | No |
| Solo Agentgateway (Enterprise) | MCPGateway | No | No | No | No | No |
| agentgateway (OSS) | MCPGateway | No | No | No | No | No |
| Amazon Bedrock (AI Gateway/Controls) | Adjacent | No | No | No | No | No |
| WrangleAI | Adjacent (Cost Governance) | No | No | No | No | No |
| Mavvrik | Adjacent (Cost Governance) | No | No | No | No | No |
| Credo AI | Adjacent (Governance) | No | No | No | No | No |
| Robust Intelligence | Adjacent (Security/Validation) | No | No | No | No | No |
| Arize AI | Adjacent (Observability) | No | No | No | No | No |
| Evidently AI | Adjacent (Observability) | No | No | No | No | No |
| Helicone | Adjacent (Gateway+Observability) | No | No | No | No | No |
| Coralogix | Adjacent (Observability) | No | No | No | No | No |
| Datadog | Adjacent (Observability) | No | No | No | No | No |
| New Relic | Adjacent (Observability) | No | No | No | No | No |
| Dynatrace | Adjacent (Observability) | No | No | No | No | No |

Notes:
- "Yes" indicates first‑class, provable runtime controls embedded inline on request execution.
- Adjacent tools are complementary for visibility/governance but generally do not enforce per‑request constraints.

Explanation (why cost governance ≠ runtime budget enforcement):
- Runtime budget enforcement requires being inline on every request to pre‑authorize/hold against a budget ledger, decrement idempotently on completion, fail closed with deterministic HTTP 402 when over limit, apply mid‑stream caps, and emit per‑call cryptographic receipts.
- Cost governance tools typically provide token/GPU visibility, forecasting, budgets, alerts, and chargebacks; sometimes provider/account‑level spend limits. These are reactive or coarse controls, not per‑request enforcement.
- Provider quotas/alerts can cut off accounts or raise tickets but do not block a single off‑budget call with 402 semantics, nor do they issue per‑call receipts or enforce streaming caps.
- Some gateways offer rate‑limiting/caching/routing, but rate limits are not the same as budget ledgers with 402 semantics and receipts.


