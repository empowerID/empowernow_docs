---
id: marketing-research-matrix-pdp
title: PDP Competitor Matrix
slug: /marketing/research/matrix/pdp
---

# PDP competitor matrix

The live head‑to‑head matrix is below. Source of truth lives in `marketing/research/matrix/pdp.md`.

```startLine:endLine:marketing/research/matrix/pdp.md
# PDP Head-to-Head Matrix (AuthZEN Decisions)

| Product                              | AuthZEN-style decision contract (decision + constraints + obligations)    | Merge semantics (conflict)                   | Explainability / Replay              | TTL / Caching in response              | PIP/Membership integration  | Latency posture             | Pricing/Model    | Evidence |
| ------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ | -------------------------------------- | --------------------------- | --------------------------- | ---------------- | -------- |
| **EmpowerNow PDP (target)**          | **Yes** (constraints + obligations; conservative merge; TTL; decision_id) | **Conservative (intersection/min)**          | **Yes** (reasons, schemas, receipts) | **TTL surfaced**                       | **Built-in Membership PIP** | **ms-range**                | Platform         | — |
| **Cerbos**                           | Outputs ≈ obligations; no AuthZEN contract                                | Effect precedence / rule order               | Studio/Playground; Outputs           | Not explicit in envelope               | Bring your own inputs       | Self-hosted; low-ms typical | OSS + commercial | [Docs](https://docs.cerbos.dev/cerbos/latest/policies/outputs.html) |
| **OPA**                              | Arbitrary JSON; no standard obligations model                             | Author-defined in Rego                       | Decision logs; `explain` tooling     | Bundles/external data; not in response | External data/PIPs          | Sidecar/in-proc; ms-range   | OSS; Styra DAS   | [Overview](https://openpolicyagent.org/docs) |
| **Axiomatics (XACML)**               | XACML Response with **Obligations/Advice**                                | Combining algorithms (deny/permit-overrides) | Vendor tooling; XACML advice         | Not standard in response               | Standard PIP model          | Enterprise PDP              | Commercial       | [XACML](https://axiomatics.com/resources/reference-library/extensible-access-control-markup-language-xacml) |
| **AWS Verified Permissions (Cedar)** | Cedar allow/forbid; enforcement outside service                           | Cedar evaluation semantics                   | Limited response enrichment          | Managed; not surfaced                  | App supplies context        | Managed service             | AWS metered      | [AVP](https://aws.amazon.com/verified-permissions/) |
| **AuthZed SpiceDB (Zanzibar)**       | FGA check; not constraints/obligations                                    | Tuple/graph evaluation                       | Consistency tokens & dashboards      | ZedTokens (consistency)                | Graph store                 | API latency metrics         | SaaS + OSS       | [Consistency](https://authzed.com/docs/spicedb/concepts/consistency) |
| **Ory Keto (Zanzibar)**              | FGA check; not constraints/obligations                                    | Tuple/graph evaluation                       | Logs/metrics via deployment          | n/a                                    | Graph store                 | “Split-second” claims       | OSS + SaaS       | [Overview](https://www.ory.sh/keto) |
| **Istio/Envoy policy**               | N/A (enforcement layer)                                                   | Ordered: CUSTOM→DENY→ALLOW                   | Mesh logs                            | n/a                                    | External auth to PDP        | In-proxy                    | OSS              | [Envoy ext_authz](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter) |

> Interpretation: EmpowerNow’s differentiator is a standardized response (decision + normalized constraints + obligations + TTL) and a documented conservative merge. Competitors either (a) provide allow/deny only, (b) expose ad-hoc outputs, or (c) focus on graph/FGA without constraints/obligations.
```

