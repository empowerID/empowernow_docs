Here’s a tight, professional **PDP (AuthZEN Decisions) deep-research pack** you can drop into `/marketing/research/competitors/pdp/` and use to populate your PDP briefs, battlecards, and the comparison matrix.

---

# 1) Competitor dossiers (JSON, normalized)

> Fields use the controlled vocab you specified: `authzen_contract`, `conservative_merge`, `obligations`, `ttl`, `pip_membership`, plus `explainability`, `merge_rule`, `latency_notes`, `pricing_signals`, and `evidence` (≤25-word quotes/URLs).

### cerbos.json

```json
{
  "name": "Cerbos",
  "url": "https://cerbos.dev",
  "category": "PDP",
  "capabilities": ["obligations", "explainability"],
  "claims": ["policy_outputs", "schemas", "stateless_pdp"],
  "authzen_contract": false,
  "conservative_merge": "rule/effect driven; deny takes precedence within policy sets",
  "obligations": true,
  "ttl": "cache and policy repo features; no explicit TTL in decision envelope",
  "pip_membership": "via inputs; no bundled graph/PIP",
  "explainability": "policy outputs; best-practice guidance; studio/playground",
  "merge_rule": "policy evaluation order + effect precedence",
  "latency_notes": "self-hosted binary; typical sub-ms to low-ms in-process (deployment dependent)",
  "pricing_signals": "open source + commercial features",
  "evidence": [
    {"type":"url","href":"https://docs.cerbos.dev/cerbos/latest/policies/outputs.html"},
    {"type":"url","href":"https://www.cerbos.dev/blog/making-cerbos-policies-bulletproof-with-schemas"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(Outputs/“obligations” equivalent and schemas: ([docs.cerbos.dev][1]))

### opa.json

```json
{
  "name": "Open Policy Agent (OPA)",
  "url": "https://www.openpolicyagent.org",
  "category": "PDP",
  "capabilities": ["explainability"],
  "claims": ["general_policy_engine", "unified_enforcement"],
  "authzen_contract": false,
  "conservative_merge": "author-defined via Rego; no standardized merge contract",
  "obligations": "arbitrary JSON possible; not a first-class obligations model",
  "ttl": "bundle/external-data caching; not explicit in decision payload",
  "pip_membership": "via external data/PIPs you implement",
  "explainability": "decision logs + explain tooling",
  "merge_rule": "policy-author logic in Rego",
  "latency_notes": "in-process or sidecar; ms-range; depends on policy/data size",
  "pricing_signals": "open source; Styra DAS is commercial control plane",
  "evidence": [
    {"type":"url","href":"https://openpolicyagent.org/docs"},
    {"type":"url","href":"https://openpolicyagent.org/docs/management-decision-logs"},
    {"type":"url","href":"https://openpolicyagent.org/docs/external-data"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(OPA docs, decision logs, external data: ([openpolicyagent.org][2]))

### aws_verified_permissions.json

```json
{
  "name": "Amazon Verified Permissions (Cedar)",
  "url": "https://aws.amazon.com/verified-permissions/",
  "category": "Managed PDP",
  "capabilities": [],
  "claims": ["managed_service", "cedar_language"],
  "authzen_contract": false,
  "conservative_merge": "Cedar evaluation semantics; allow/forbid policy evaluation",
  "obligations": false,
  "ttl": "managed; no explicit TTL in decision response",
  "pip_membership": "application implements context lookups",
  "explainability": "docs stress enforcement outside the service; limited response enrichment",
  "merge_rule": "Cedar policy semantics",
  "latency_notes": "managed service; latency varies by region/config",
  "pricing_signals": "AWS metered service pricing",
  "evidence": [
    {"type":"url","href":"https://aws.amazon.com/verified-permissions/"},
    {"type":"quote","text":"If Verified Permissions evaluation returns a deny, enforcement is outside the service.","href":"https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/terminology.html"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(AWS page and enforcement note: ([Amazon Web Services, Inc.][3]))

### axiomatics_xacml.json

```json
{
  "name": "Axiomatics (XACML PDP)",
  "url": "https://axiomatics.com",
  "category": "PDP (XACML)",
  "capabilities": ["obligations"],
  "claims": ["abac_at_scale", "xacml_enterprise"],
  "authzen_contract": false,
  "conservative_merge": "XACML combining algorithms (deny-overrides/permit-overrides)",
  "obligations": true,
  "ttl": "not standard in response; caching handled by deployment",
  "pip_membership": "standard PIP model",
  "explainability": "enterprise tooling; XACML advice/obligations",
  "merge_rule": "XACML combining algos",
  "latency_notes": "enterprise PDP; depends on topology",
  "pricing_signals": "commercial",
  "evidence": [
    {"type":"url","href":"https://axiomatics.com/resources/reference-library/extensible-access-control-markup-language-xacml"},
    {"type":"quote","text":"PDP evaluates advice expressions and returns advice/obligations to the PEP.","href":"https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(XACML flow + obligations/advice: ([Axiomatics][4]))

### authzed_spicedb.json

```json
{
  "name": "AuthZed SpiceDB",
  "url": "https://authzed.com",
  "category": "FGA / Zanzibar",
  "capabilities": [],
  "claims": ["zanzibar_model", "consistency_tokens"],
  "authzen_contract": false,
  "conservative_merge": "relationship checks; tuple semantics",
  "obligations": false,
  "ttl": "consistency via ZedTokens; not TTL constraints in decision",
  "pip_membership": "n/a (FGA store)",
  "explainability": "consistency docs; dashboards with latency metrics",
  "merge_rule": "graph evaluation",
  "latency_notes": "API latency metrics surfaced in dashboard",
  "pricing_signals": "SaaS + OSS",
  "evidence": [
    {"type":"quote","text":"API latency metrics in the Authzed dashboard.","href":"https://authzed.com/blog/observability-shouldnt-be-private"},
    {"type":"url","href":"https://authzed.com/docs/spicedb/concepts/consistency"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(Latency metrics/consistency tokens: ([AuthZed][5]))

### ory_keto.json

```json
{
  "name": "Ory Keto",
  "url": "https://www.ory.sh/keto",
  "category": "FGA / Zanzibar",
  "capabilities": [],
  "claims": ["zanzibar_inspired", "fast", "grpc_rest"],
  "authzen_contract": false,
  "conservative_merge": "relationship tuples; check APIs",
  "obligations": false,
  "ttl": "n/a",
  "pip_membership": "n/a (FGA store)",
  "explainability": "graph-oriented; logs/metrics via deployment",
  "merge_rule": "graph evaluation",
  "latency_notes": "“split-second decision making” (marketing)",
  "pricing_signals": "OSS + Ory Network SaaS",
  "evidence": [
    {"type":"quote","text":"Open source, lightning fast; based on Google Zanzibar.","href":"https://www.ory.sh/keto"},
    {"type":"url","href":"https://github.com/ory/keto"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(Claims page & repo: ([Ory Corp][6]))

### istio_envoy_mesh.json  *(service-mesh policy layer, not PDP)*

```json
{
  "name": "Istio/Envoy Policy",
  "url": "https://istio.io/latest/docs/reference/config/security/authorization-policy/",
  "category": "Service Mesh Policy",
  "capabilities": [],
  "claims": ["allow/deny/custom chain", "ext_authz integration"],
  "authzen_contract": false,
  "conservative_merge": "evaluation order (CUSTOM → DENY → ALLOW)",
  "obligations": false,
  "ttl": "n/a",
  "pip_membership": "via external auth or inline attributes",
  "explainability": "mesh logs/telemetry; not PDP explain",
  "merge_rule": "ordered actions; Envoy RBAC/external auth",
  "latency_notes": "in-proxy checks; ext_authz adds network hop",
  "pricing_signals": "open source",
  "evidence": [
    {"type":"quote","text":"CUSTOM precedes DENY then ALLOW.","href":"https://istio.io/latest/docs/reference/config/security/authorization-policy/"},
    {"type":"url","href":"https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter"}
  ],
  "lastFetched": "2025-09-25",
  "stalenessDays": 60
}
```

(Istio order + Envoy ext_authz: ([Istio][7]))

---

# 2) PDP head-to-head matrix (marketing-ready)

| Product                              | AuthZEN-style decision contract (decision + constraints + obligations)    | Merge semantics (conflict)                   | Explainability / Replay              | TTL / Caching in response              | PIP/Membership integration  | Latency posture             | Pricing/Model    |                                  |
| ------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ | -------------------------------------- | --------------------------- | --------------------------- | ---------------- | -------------------------------- |
| **EmpowerNow PDP (target)**          | **Yes** (constraints + obligations; conservative merge; TTL; decision_id) | **Conservative (intersection/min)**          | **Yes** (reasons, schemas, receipts) | **TTL surfaced**                       | **Built-in Membership PIP** | **ms-range**                | Platform         |                                  |
| **Cerbos**                           | Outputs ≈ obligations; no AuthZEN contract                                | Effect precedence / rule order               | Studio/Playground; Outputs           | Not explicit in envelope               | Bring your own inputs       | Self-hosted; low-ms typical | OSS + commercial | ([docs.cerbos.dev][1])           |
| **OPA**                              | Arbitrary JSON; no standard obligations model                             | Author-defined in Rego                       | Decision logs; `explain` tooling     | Bundles/external data; not in response | External data/PIPs          | Sidecar/in-proc; ms-range   | OSS; Styra DAS   | ([openpolicyagent.org][2])       |
| **Axiomatics (XACML)**               | XACML Response with **Obligations/Advice**                                | Combining algorithms (deny/permit overrides) | Vendor tooling; XACML advice         | Not standard in response               | Standard PIP model          | Enterprise PDP              | Commercial       | ([docs.oasis-open.org][8])       |
| **AWS Verified Permissions (Cedar)** | Cedar allow/forbid; enforcement outside service                           | Cedar evaluation semantics                   | Limited response enrichment          | Managed; not surfaced                  | App supplies context        | Managed service             | AWS metered      | ([Amazon Web Services, Inc.][3]) |
| **AuthZed SpiceDB (Zanzibar)**       | FGA check; not constraints/obligations                                    | Tuple/graph evaluation                       | Consistency tokens & dashboards      | ZedTokens (consistency)                | Graph store                 | API latency metrics         | SaaS + OSS       | ([AuthZed][9])                   |
| **Ory Keto (Zanzibar)**              | FGA check; not constraints/obligations                                    | Tuple/graph evaluation                       | Logs/metrics via deployment          | n/a                                    | Graph store                 | “Split-second” claims       | OSS + SaaS       | ([Ory Corp][6])                  |
| **Istio/Envoy policy**               | N/A (enforcement layer)                                                   | Ordered: CUSTOM→DENY→ALLOW                   | Mesh logs                            | n/a                                    | External auth to PDP        | In-proxy                    | OSS              | ([Istio][7])                     |

> **Interpretation:** Empow­erNow’s differentiator is a **standardized response** (decision + **normalized constraints + obligations + TTL**) and a **documented conservative merge**. Competitors either (a) provide allow/deny only, (b) expose ad-hoc outputs, or (c) focus on graph/FGA without constraints/obligations.

---

# 3) Findings by your evaluation questions

**Contract comparison (constraints/obligations/TTL/explainability)**

* **Cerbos**: “Policy Outputs” can return structured data akin to obligations; no TTL in response; has studio/playground and schemas. ([docs.cerbos.dev][1])
* **OPA**: arbitrary JSON decisions, decision logs + explain; no standardized obligations/TTL envelope. ([openpolicyagent.org][2])
* **XACML (Axiomatics)**: obligations/advice are first-class; classic ABAC flow. ([docs.oasis-open.org][8])
* **AWS Verified Permissions**: Cedar response; enforcement is explicitly **outside** the service; docs don’t expose TTL in response. ([AWS Documentation][10])
* **Zanzibar FGA (AuthZed/Ory Keto)**: graph checks; no constraint/obligation envelope; AuthZed documents consistency tokens (ZedTokens) and exposes latency metrics. ([AuthZed][9])
* **Istio/Envoy**: policy order and external-auth integration; not a PDP contract. ([Istio][7])

**Merge semantics (union/priority/intersection)**

* **EmpowerNow** (positioning): **intersection/min** as the conservative default across constraint buckets.
* **OPA**: merge is implicit in Rego; author defines semantics. ([openpolicyagent.org][2])
* **Cerbos**: effect precedence within policy sets; deny/allow ordering—no cross-policy “min/intersection” contract. ([docs.cerbos.dev][11])
* **XACML**: formal combining algorithms (deny/permit-overrides). ([docs.oasis-open.org][8])
* **Zanzibar FGA**: tuple/graph evaluation (no constraint merge concept). ([AuthZed][12])
* **Istio**: explicit action precedence (CUSTOM→DENY→ALLOW). ([Istio][7])

**Latency posture (p50/p95 & caching/TTL patterns)**

* **AuthZed** surfaces API latency metrics in dashboard (good proof point). ([AuthZed][5])
* **Ory Keto** markets “lightning fast / split-second”. ([Ory Corp][6])
* **OPA** is commonly embedded/sidecar with ms-range; uses bundles/external data caching (no response TTL). ([openpolicyagent.org][13])
* **AWS Verified Permissions** managed latency; no public per-call TTL in response. ([Amazon Web Services, Inc.][3])
* **Istio/Envoy** in-proxy; external auth adds a network round-trip. ([envoyproxy.io][14])

**Explainability / replay / audit export**

* **OPA** decision logs (audit/replay). ([openpolicyagent.org][15])
* **Cerbos** outputs + studio; schemas aid validation. ([docs.cerbos.dev][1])
* **XACML** advice/obligations; enterprise tooling. ([docs.oasis-open.org][8])
* **AuthZed** provides consistency tokens; observability/latency dashboards. ([AuthZed][9])

---

# 4) What this means for EmpowerNow PDP positioning

* **Lead with the contract**: “**AuthZEN-aligned decision + normalized constraints + obligations + TTL**” — this is notably rare.
* **Own “conservative merge”** as a safety feature: **intersection/min** across constraint buckets (vs. vendor-specific precedence or author-defined merges).
* **Call out gaps** in gateways/meshes/FGA: they’re **great at allow/deny or graph checks**, but not at **constraints + obligations + TTL** that downstream PEPs can **enforce**.
* **Proof hooks**: pair PDP with **ARIA Shield** streaming/budget enforcement and **Receipt Vault** to demonstrate constraints → enforcement → cryptographic proof (a chain others can’t show with citations above).

---

# 5) Drop-in research artifacts (paste into repo)

* `marketing/research/competitors/pdp/{cerbos,opa,aws_verified_permissions,axiomatics_xacml,authzed_spicedb,ory_keto,istio_envoy_mesh}.json` — use the JSON blocks above.
* `marketing/research/serp/pdp.csv` — columns: `keyword, rank, title, url, angle, content_type, notes` (populate with your Tier1/2/3 sets).
* `marketing/research/matrix/pdp.md` — copy the table in section 2.
* `marketing/research/velocity/pdp.md` — add release cadence notes per vendor (links above).

If you want, I can now generate the **battlecard notes** (traps/counters/proof beats) for PDP vs. **Cerbos, OPA, XACML, and Zanzibar FGA** using this evidence base.

[1]: https://docs.cerbos.dev/cerbos/latest/policies/outputs.html?utm_source=chatgpt.com "Outputs"
[2]: https://openpolicyagent.org/docs?utm_source=chatgpt.com "Introduction"
[3]: https://aws.amazon.com/verified-permissions/?utm_source=chatgpt.com "Fine-Grained Authorization - Amazon Verified Permissions"
[4]: https://axiomatics.com/resources/reference-library/extensible-access-control-markup-language-xacml?utm_source=chatgpt.com "eXtensible Access Control Markup Language (XACML)"
[5]: https://authzed.com/blog/observability-shouldnt-be-private?utm_source=chatgpt.com "Observability shouldn't be private"
[6]: https://www.ory.sh/keto?utm_source=chatgpt.com "Ory Keto: Authorization Server inspired by Google Zanzibar"
[7]: https://istio.io/latest/docs/reference/config/security/authorization-policy/?utm_source=chatgpt.com "Authorization Policy"
[8]: https://docs.oasis-open.org/xacml/3.0/xacml-3.0-core-spec-cd-03-en.html?utm_source=chatgpt.com "eXtensible Access Control Markup Language (XACML ..."
[9]: https://authzed.com/docs/spicedb/concepts/consistency?utm_source=chatgpt.com "Consistency – AuthZed Docs"
[10]: https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/terminology.html?utm_source=chatgpt.com "Amazon Verified Permissions and Cedar policy language ..."
[11]: https://docs.cerbos.dev/cerbos/latest/policies/best_practices.html?utm_source=chatgpt.com "Best practices and recipes"
[12]: https://authzed.com/learn/google-zanzibar?utm_source=chatgpt.com "An Introduction to Google Zanzibar and Relationship ..."
[13]: https://openpolicyagent.org/docs/external-data?utm_source=chatgpt.com "External Data"
[14]: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter?utm_source=chatgpt.com "External Authorization"
[15]: https://openpolicyagent.org/docs/management-decision-logs?utm_source=chatgpt.com "Decision Logs"
