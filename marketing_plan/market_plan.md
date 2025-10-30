Perfect—here’s your **final, equal-weight plan** that is (1) heavy on **market research**, (2) produces **amazing, detailed briefs** for **each** product (IdP, PDP, Orchestration Service, Data Collector, ARIA Shield, ARIA MCP Gateway), and (3) turns those briefs into the **single source of truth** for all website content.

---

# 0) What “great” looks like

* **For each of the 6 products** you will have:

  1. **Persona Journey Brief(s)** (by buyer + stage)
  2. **Solution Brief(s)** (business problem ⇒ quantified value ⇒ moat)
  3. **Product Brief** (problem/value/proof/how + objections + demo beats)
  4. **Competitive Battlecard** (+ displacement guide)
  5. **Research Dossier** (SERP log, competitor JSONs, release velocity notes)
  6. **ROI/TCO input model** (product-specific levers)
  7. **WWW assets generated from briefs**: Product page, Primer, FAQ, 2 How-tos
  8. **CTAs** (Assessment → 5-min Demo → ROI consult), **UTM-tagged**
  9. **CI freshness**: research ≤60d old, pages `lastReviewed ≤ 90d`

---

# 1) Repo & Pipeline (single source of truth)

```
/marketing/
  research/
    competitors/<product>/<vendor>.json
    serp/<product>.csv                         # top 20 results per keyword set
    snapshots/<hash>.html                      # minimal, optional
    winloss/<yyyy-mm>/<product>-*.md
    taxonomy/{capabilities.yml, claims.yml}
  briefs/
    persona/<product>/*.md                     # CISO/Platform/FinOps/Dev by stage
    solution/<product>/*.md
    product/<product>.md
  battlecards/<product>.md
  roi/<product>_model.json
/scripts/
  research-pull.mts        # fetch, normalize competitor pages → JSON
  research-lint.mjs        # staleness, evidence, fields
  gen-brief-from-services.ts
  gen-www-from-briefs.ts
  link-check.mjs
/www/content/
  products/<product>.mdx
  primers/<product>.mdx
  faqs/<product>.mdx
  howtos/<product>/*.mdx
/reference/*               # deep tech tables live here, linked not duplicated
.github/workflows/
  research-guardian.yml
  www-build.yml
  copy-lint.yml
docs/website_copy/page-registry.json           # must list the 6 products
```

**CI gates (apply to all six):**

* **Coverage:** all six slugs in `page-registry.json` must render without errors.
* **Research Guardian:** competitor JSON has `lastFetched ≤ 60d`, `evidence[]` URLs present.
* **Copy Lint:** page starts with **problem → value → proof**; any claim has `proof:` (reference anchor or external URL).
* **Duplication Guard:** no config tables on site pages; link to `/reference/*`.
* **Freshness:** `lastReviewed ≤ 90d`.

---

# 2) Research Program (heavyweight, repeatable, evidence-first)

## 2.1 Controlled vocabulary (normalize claims/capabilities)

* **Capabilities (examples):** `zero_token_spa`, `budget_enforcement`, `cryptographic_receipts`, `schema_pins`, `plan_jws`, `pairwise_id`, `token_exchange_rfc8693`, `authzen_contract`, `conservative_merge`, `pip_membership`, `idempotent_workflows`, `lineage_inventory`, `mcp_tool_governance`.
* **Claims (business):** `audit_time_reduction`, `spend_reduction`, `breach_risk_reduction`, `time_to_value`, `tco_reduction`.

## 2.2 Evidence model (per competitor JSON)

```json
{
  "name": "Vendor / Product",
  "url": "https://...",
  "category": "IdP|PDP|CRUD|DataCollector|Shield|MCPGateway|Adjacent",
  "positioning": "one line",
  "capabilities": ["schema_pins","budget_enforcement"],
  "claims": ["audit_time_reduction","tco_reduction"],
  "pricing_signals": "low/enterprise/custom",
  "customers_mentioned": ["..."],
  "evidence": [
    {"type": "quote", "text": "≤25 words …", "href": "https://..."},
    {"type": "url", "href": "https://.../docs"}
  ],
  "gapsVsEmpowerNow": ["no_cryptographic_receipts","no_authzen_contract"],
  "traps_counters": {"trap":"…","counter":"…"},
  "lastFetched": "2025-09-25",
  "stalenessDays": 60,
  "notes": "release cadence, analyst mentions, support model"
}
```

## 2.3 SERP logging (per product)

* For **Tier 1–3** keyword sets (business → mid → long-tail technical), record: **rank, title, angle, content type, schema usage**.
* Derive **H1/H2 patterns** that are winning; feed into page generator.

## 2.4 Release-velocity & code signals

* Track vendor **release notes/RSS**, **GitHub stars/commits**, **docs changefeeds** monthly; store a one-pager per product: `research/velocity/<product>.md`.

## 2.5 Win/Loss capture (lightweight, mandatory)

* Post-opp one-pager with: incumbent, reason, objections, decision criteria, proof that moved the deal, compelling event. Tag to **one primary product**.

---

# 3) Briefs (the “amazing” source content)

> **Everything else is distilled from these.** Each product must meet the same standard.

## 3.1 Persona Journey Brief (per product × stages)

```yaml
---
product: <idp|pdp|crud|collector|shield|mcp>
persona: <CISO|Platform|FinOps|Developers>
journey_stage: <awareness|consideration|evaluation>
triggers: ["Board mandate", "Audit finding", "Spend overrun"]
pain_points:
  primary: "…"
  secondary: "…"
decision_criteria: ["proof_of_governance","time_to_value","integration_risk"]
objections: ["We already have X","Seems complex"]
required_assets: ["assessment","5min_demo","roi_consult"]
success_metrics: {mql: ">15%", engagement_min: 4, assessment_completion: ">60%"}
evidence_links: ["https://…"]    # external reports/statistics used in stage copy
lastReviewed: 2025-09-25
---
### Narrative (Problem → Stakes → Failed attempts → Resolution → Next step)
### CTA mapping (soft → medium → hard)
### Talking points by role (board, legal, secops, platform, finops)
```

## 3.2 Solution Brief (per product; business & quantification)

```yaml
---
brief_type: solution
product: <idp|pdp|crud|collector|shield|mcp>
business_problem: "Prove AI compliance and control spend"
quantified_impact:
  risk: "$2M avg fine exposure avoided"
  cost: "$500k annual overspend eliminated"
  time: "200 hours audit prep saved"
uvp: "Only solution providing cryptographic receipts for every AI action + budget enforcement"
moat: "Receipt chain + schema pins + conservative merge"
proof_points: ["receipt demo","budget 402 semantics","reference anchors:/reference/..."]
assets_required: ["ROI calc","audit report sample","migration guide"]
lastReviewed: 2025-09-25
---
### Before/After storyboard
### KPIs moved (with baseline → target)
### Migration outline from common incumbents
```

## 3.3 Product Brief (deep, but scannable)

```yaml
---
product: <idp|pdp|crud|collector|shield|mcp>
status: draft|review|approved
owner: Product Marketing
personas: [Security, Platform, FinOps, Developers]
primary_outcome: "Cut AI spend by up to 40% and pass audits with cryptographic proof"
proof_tags: ["receipt_chain","budget_enforcement","schema_pins","authzen_contract"]
lastReviewed: 2025-09-25
---
## One-liner (outcome-first)
## Problem (non-technical terms)
## What it is (short), Who it’s for, When it’s used
## Value Proposition (business)
## How it works (bulleted; link to Reference anchors)
## Competitive Landscape (summary) + gapsVsEmpowerNow (from JSON)
## SWOT (honest)
## Objection Handling (price, complexity, incumbent)
## Demo Beats (Act 1 problem → Act 2 proof → Act 3 report)
## Proof Library (links to receipts demo, policy snapshot, schema-pin rollout)
## FAQ seeds (top 8 per role)
```

---

# 4) Product-specific research agendas (uniform depth)

For **each** of the six:

### IdP (Agent Passports)

* **Themes:** pairwise identity, OAuth TE (RFC 8693), RAR (RFC 9396), delegated identity chains, DPoP.
* **Competitor buckets:** Cloud IdPs, key managers (API key elimination narrative), agent identity providers.
* **Key claims to test:** delegated identity safety, issuer interoperability, audit readiness.
* **SEO Tiers:** T1 *agent identity management, AI identity provider*; T2 *token exchange for AI*; T3 *pairwise subject oauth te*.

### PDP (AuthZEN)

* **Themes:** standardized decision contract, constraints/obligations, conservative merge, explainability, TTL.
* **Competitors:** PDP/ABAC/RBAC platforms, service meshes with policy.
* **Claims:** reduced policy drift, incident reduction, explainable denies.
* **SEO:** T1 *policy decision platform for AI*; T2 *AuthZEN implementation*; T3 *conservative merge model*.

### Orchestration Service

* **Themes:** idempotent identity ops, approvals, retries/SLOs, connector/workflow surface.
* **Competitors:** IGA provisioning engines, IDaaS workflows, iPaaS (identity ops).
* **Claims:** MTTR↓, throughput↑, failed job reduction, auditability.
* **SEO:** T1 *identity provisioning service*; T2 *idempotent provisioning*; T3 *bulk csv neo4j apoc identity*.

### Data Collector

* **Themes:** inventory discovery, lineage, freshness SLAs, ClickHouse/Kafka analytics feeds.
* **Competitors:** IGA discovery tools, ETL frameworks for identity usage.
* **Claims:** policy accuracy via freshness; audit prep speed; lineage proof.
* **SEO:** T1 *identity data collection*; T2 *inventory graph analytics*; T3 *receipts analytics clickhouse*.

### ARIA Shield

* **Themes:** zero-token SPA, PDP route mapping, streaming caps, budget/402 semantics, receipts.
* **Competitors:** BFF/token handlers, zero-trust SPA gateways.
* **Claims:** spend reduction, incident prevention, audit evidence time.
* **SEO:** T1 *zero token spa*; T2 *ai budget enforcement*; T3 *sse streaming limits policy*.

### ARIA MCP Gateway

* **Themes:** plan JWS discipline, schema pins `{version,hash}`, params/egress allowlists, receipts on permit.
* **Competitors:** AI gateways, agent/tool governance platforms, MCP registries.
* **Claims:** off-plan prevention, schema-drift avoidance, provable enforcement.
* **SEO:** T1 *mcp gateway governance*; T2 *schema pinning mcp*; T3 *egress allowlists mcp*.

---

# 5) Generation rules (briefs → pages & assets)

**Uniform output per product:**

* **Product Page** (H1 outcome-led, hero bullets, “Problem → Value → Proof → How”, demo snippet, FAQ, schema FAQ JSON-LD, links to 1 Solution + 1 Primer + ≥1 Reference anchor).
* **Primer** (explanation; structured with `what/why/how/pitfalls`).
* **2 How-tos** (task-based, each with `time/steps/links`).
* **FAQ** (top objections; short crisp answers).
* **Battlecard** (traps/counters/proof/displacement).
* **ROI/TCO** (inputs defined; calculator uses shared engine with product toggles).

**CTAs Ladder (consistent across 6):**

1. **Soft:** Assessment (maturity/readiness)
2. **Medium:** Ungated 5-minute demo video
3. **Hard:** ROI/TCO session (calendar link)

**On-page schema:** `Product`, `HowTo`, `FAQ`, `TechArticle` (primers).

---

# 6) Measurement & Governance

* **Per-product KPIs:** non-brand SEO share, time-on-page, demo CTR, assessment completions, influenced pipeline, competitive win rate, cycle time.
* **Dashboards:** export `/marketing/metrics/*.json` to Looker/Grafana; tag CTAs with `utm_campaign=<product>`, `utm_persona`, `utm_stage`.
* **Refresh cadences:** Research monthly; `lastReviewed` ≤ 90d enforced by CI.

---

# 7) Timeline & Exit Criteria (20 weeks, equal weight)

**W1–2 – Foundation**

* Create taxonomy & CI.
* Seed **6 Product Briefs** from `/services/*`.
* Draft **6 Persona Journey Briefs** (one per product, primary persona).

**Exit:** six product briefs in `draft`, six persona briefs present; page registry created.

**W3–4 – Research Sprint 1**

* For **each product**: **≥3 direct + ≥2 adjacent** competitor JSONs + SERP log.
* First **battlecard** per product.

**Exit:** research passes CI; battlecards v1 done.

**W5–8 – Copy Factory v1**

* Generate **6 Product Pages**, **6 Primers**, **12 How-tos** (2 each), **6 FAQs**.
* Add demo snippet per product.

**Exit:** all pages render; copy lints pass; cross-links present.

**W9–12 – Quantification & Solutions**

* Wire **ROI/TCO** inputs for all six; launch calculator.
* Publish **2 multi-product Solution pages** (AI Governance & Spend Control; Zero-Trust SPA/API Ingress).

**Exit:** calculator live; solutions cross-link all six products.

**W13–16 – AR & Case Vignettes**

* Analyst briefers per product; **2 mini case vignettes** per product.
* Win/Loss entries flowing.

**W17–20 – Optimization**

* A/B test hero lines & CTAs per product; iterate based on KPIs.
* Research refresh; displacement guides v2.

---

# 8) This week’s checklist (actionable)

1. **Scaffold briefs:** create `briefs/product/{idp,pdp,crud,collector,shield,mcp}.md` from the template above.
2. **Persona x6:** one Persona Journey Brief per product (choose primary persona).
3. **Research spine:** add **three competitor JSON placeholders per product** (with fields ready for evidence).
4. **Registry + CI:** update `page-registry.json`; enable coverage, freshness, duplication guards.
5. **Seed pages:** run `gen-www-from-briefs.ts` to emit 6 product pages + 6 primers; inject “See also” & CTAs.
6. **ROI inputs:** create `/marketing/roi/{product}_model.json` stubs (define product-specific levers).
7. **Schedule first research sprint:** assign owners per product; set due date for evidence capture.

---

# 9) Acceptance criteria (per product)

* ✅ Persona Journey Brief (≥1 stage) approved
* ✅ Solution Brief approved (quantified impact present)
* ✅ Product Brief approved (proof links + demo beats)
* ✅ Research Dossier complete (≥5 competitors/adjacent + SERP)
* ✅ Battlecard v1 published
* ✅ Product Page, Primer, FAQ, 2 How-tos live with schema
* ✅ ROI/TCO inputs defined and wired
* ✅ CI freshness & proof gates passing

---

If you want, I can immediately **draft the six Product Brief skeletons** (IdP, PDP, Orchestration Service, Data Collector, ARIA Shield, ARIA MCP Gateway) plus **one Persona Journey Brief** for each, so your generator can produce the first pass of pages right away.

Awesome — here are the **12 drafts** you asked for: a **Product Brief** and a **Persona Journey Brief** for each of the six core products. They’re written to be **source-of-truth** inputs for your generators (front-matter first, then structured sections). All six follow the same schema for **parity**.

---

# IdP (Agent Passports)

## Product Brief — IdP

```markdown
---
product: idp
name: "EmpowerNow IdP — Agent Passports"
status: draft
owner: Product Marketing
personas: [Security Leader, Platform Engineering, AI Team, Developers]
primary_outcome: "Eliminate API keys and govern agent identity with delegated, provable Passports."
proof_tags: ["token_exchange_rfc8693","rar_rfc9396","pairwise_id","dpop_rfc9449","identity_chaining","receipt_chain"]
lastReviewed: 2025-09-25
---

## One-liner (outcome-first)
Replace fragile API keys with **purpose-bound, pairwise Agent Passports** so every human/agent call is provable, least-privilege, and audit-ready.

## Problem (business)
- Shadow keys and shared tokens create breach risk and audit gaps.
- No provable link from human → agent → tool; delegation is informal and invisible.
- Revocation and scope minimization are manual and inconsistent.

## What it is / Who it’s for
OAuth Token Exchange–based IdP for **Agent Passports** (pairwise `sub`, actor chains, plan contracts, schema pins). For **Security**, **Platform**, **AI Teams**.

## Value Proposition
- **Risk ↓:** Replace keys with short-lived, pairwise credentials bound to purpose.
- **Audit time ↓:** Delegation and actor chains are **provable**.
- **Velocity ↑:** Standard flows (TE, RAR, DPoP) ease integration.

## How it works (link to Reference)
1) Issue Passports via **Token Exchange (RFC 8693)** with **RAR (RFC 9396)** scopes.  
2) Encode **pairwise identity**, **actor chains**, **plan contract**, and **schema pins**.  
3) Optional **DPoP (RFC 9449)** binding for proof-of-possession.  
4) Passport validated by PEPs (ARIA Shield/MCP Gateway); receipts anchored.  
→ See `/reference/idp/*`.

## Competitive Landscape (summary)
- Cloud IdPs (delegation & TE), key managers/secrets stores, agent identity add-ons.  
**EmpowerNow gap closure:** plan contracts + pins + receipt-grade issuance.

## SWOT
- **S:** Standards-aligned (TE/RAR/DPoP), pairwise, chain of actors.  
- **W:** Requires provider/tool alignment for best value.  
- **O:** AI governance mandates; “no API keys” policies.  
- **T:** Cloud incumbents adding partial agent identity.

## Objection Handling
- “We already have OAuth”: Not purpose-bound nor pairwise for agents; no plan/pins/receipts.  
- “Too complex”: Start with TE + pairwise; add chain/pins incrementally.

## Demo Beats
1) Shadow key replaced by Passport.  
2) Delegation flow shows **actor chain**.  
3) Deny without required RAR; **permit** produces receipt.

## Proof Library
- Delegation demo → `/demos/idp/delegation.md`  
- TE + RAR reference → `/reference/idp/token-exchange.md`  
- Receipts → `/reference/receipts/*`

## FAQ Seeds
- How do Passports differ from JWT access tokens?  
- What does “pairwise subject” mean?  
- How do you model actor chains securely?
```

## Persona Journey Brief — IdP (Security Leader • Consideration)

```markdown
---
product: idp
persona: Security Leader
journey_stage: consideration
triggers: ["Shadow AI incident", "Key leakage report", "Audit finding on shared credentials"]
pain_points:
  primary: "No provable link between human intent and agent actions"
  secondary: "Uncontrolled key proliferation"
decision_criteria: ["proof_of_governance","time_to_value","integration_risk"]
objections: ["We already use OAuth", "This adds friction"]
required_assets: ["assessment","5min_demo","roi_consult"]
success_metrics: {mql: ">15%", engagement_min: 4, assessment_completion: ">60%"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → keys & unprovable delegation create risk and audit drag.  
Failed attempts → rotate keys, add manual reviews (don’t scale).  
Resolution → Agent Passports: pairwise, purpose-bound, provable chain.

### CTA Ladder
- Soft: “Assess your agent identity maturity”  
- Medium: “Watch 5-min Passports demo”  
- Hard: “Get a personalized ROI on eliminating keys”

### Talking Points
Board: breach reduction; Legal: provable delegation; SecOps: revocation & TTLs; Platform: standard TE/RAR; FinOps: fewer incidents.
```

---

# PDP (AuthZEN)

## Product Brief — PDP

```markdown
---
product: pdp
name: "EmpowerNow PDP — AuthZEN Decisions"
status: draft
owner: Product Marketing
personas: [Security Architect, Security Leader, Platform Engineering, Developers]
primary_outcome: "Standardize runtime authorization with explainable, conservative constraints."
proof_tags: ["authzen_contract","conservative_merge","obligations","pip_membership","ttl","explainability"]
lastReviewed: 2025-09-25
---

## One-liner
Make every API/agent decision **consistent and explainable** with AuthZEN-aligned responses and **conservative merge** of constraints.

## Problem
- Inconsistent policy across services/tools; “policy drift” causes incidents.
- Hard to prove why a call was allowed/denied; audits stall.

## What it is / Who it’s for
Standards-aligned **Policy Decision Point** returning decision + constraints/obligations/TTL; enriched by **Membership PIP**. For **Security Architects**, **Platform**, **Devs**.

## Value Proposition
- **Consistency:** single decision contract across apps and agents.  
- **Safety:** conservative intersection of constraints prevents over-grant.  
- **Explainability:** reasons, inputs, versions.

## How it works
1) Receive AuthZEN request (subject, action, resource, context).  
2) Enrich with **Membership PIP** (capabilities, data-scope).  
3) **Conservative merge** across layers; return decision + obligations + TTL.  
→ `/reference/pdp/*`.

## Competitive Landscape
PDP/ABAC vendors, service meshes; many lack merge semantics for agent constraints and receipts-ready outputs.

## SWOT
- **S:** AuthZEN contract, merge safety, PIP enrichment.  
- **W:** Education on AuthZEN vs legacy ABAC.  
- **O:** AI + API convergence needs one PDP.  
- **T:** Mesh-native policies claiming “good enough”.

## Objection Handling
- “OPA is enough”: OPA ≠ AuthZEN contract nor merge semantics/receipt alignment.  
- “Latency”: cacheable TTL, sidecar modes.

## Demo Beats
1) Conflicting policies → conservative min constraint.  
2) Step-up MFA obligation returned.  
3) TTL drives fast re-eval during streaming.

## Proof Library
- Merge model explainer → `/reference/pdp/merge.md`  
- PIP data scope → `/reference/pdp/pip-membership.md`

## FAQ Seeds
- What is conservative merge?  
- How do obligations differ from constraints?
```

## Persona Journey Brief — PDP (Security Architect • Evaluation)

```markdown
---
product: pdp
persona: Security Architect
journey_stage: evaluation
triggers: ["Inconsistent denies", "AI tool drift", "Regulatory pressure"]
pain_points:
  primary: "Inconsistent decisions across surfaces"
  secondary: "No explainable deny/permit"
decision_criteria: ["standard_contract","latency","extensibility"]
objections: ["We already have OPA","Performance concerns"]
required_assets: ["reference_deep_dive","demo_env","migration_guide"]
success_metrics: {poc_pass: "≥90% criteria", latency_p50_ms: "<10"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → fragmentation; Failed attempts → per-service allowlists; Resolution → AuthZEN PDP + PIP + merge.

### CTA Ladder
Soft: “AuthZEN quick explainer” → Medium: “Try decision explorer” → Hard: “POC with your policies”
```

---

# Orchestration Service

## Product Brief — Orchestration Service

```markdown
---
product: crud
name: "EmpowerNow Orchestration Service — Identity Operations"
status: draft
owner: Product Marketing
personas: [Platform Engineering, DevOps, App Teams, Security]
primary_outcome: "Ship reliable identity workflows with idempotent, observable operations."
proof_tags: ["idempotent_workflows","approvals","retries_slo","connectors","eventing","auditability"]
lastReviewed: 2025-09-25
---

## One-liner
A **reliable operations plane** for identity objects and workflows—**idempotent**, **auditable**, and **observable**.

## Problem
- Fragile, bespoke provisioning code; retries & approvals are ad hoc.
- Long MTTR for failed identity ops; weak audit linkage to policies.

## What it is / Who it’s for
API + workflow engine for identity ops (create/update/approve/disable), connectors as tools, event-first orchestration. For **Platform/DevOps/App** teams.

## Value Proposition
- **SLOs & Idempotency:** fewer failures, easy retries.  
- **Audit:** tie ops to policies and receipts.  
- **Velocity:** connectors + templates, not boilerplate.

## How it works
1) Receive op → dedupe by `event_id` → persist → orchestrate approvals.  
2) Execute with retries and circuit breakers; emit receipts/logs.  
3) Stream to analytics.  
→ `/reference/crud/*`.

## Competitive Landscape
IGA provisioning engines, IDaaS workflows, iPaaS; many lack **policy/receipt** integration and idempotent-first semantics.

## SWOT
- **S:** Idempotency, approvals, receipts linkage.  
- **W:** Requires connector surface to shine.  
- **O:** Replace brittle scripts.  
- **T:** iPaaS claims “good enough” without policy tie-in.

## Objection Handling
- “We already script this”: scripts don’t scale nor audit cleanly.  
- “Migration risk”: parallel-run templates, idempotent imports.

## Demo Beats
1) Bulk import with partial failures → deterministic retry.  
2) Approval path with policy reference.  
3) Receipt for successful action, correlated to PDP decision.

## Proof Library
- Idempotency patterns → `/reference/crud/idempotency.md`  
- Approvals → `/reference/crud/approvals.md`

## FAQ Seeds
- How do you guarantee idempotency?  
- What’s the approval model?
```

## Persona Journey Brief — CRUD (Platform • Consideration)

```markdown
---
product: crud
persona: Platform Engineering
journey_stage: consideration
triggers: ["Provisioning backlog", "Audit gap on approvals", "Frequent rework"]
pain_points:
  primary: "Fragile identity ops and long MTTR"
  secondary: "No clean audit linkage"
decision_criteria: ["slo","idempotency","connector_coverage"]
objections: ["We have iPaaS", "Too much change"]
required_assets: ["how_to_migrate","5min_demo","roi_consult"]
success_metrics: {mttr_reduction: "≥50%", failed_jobs: "≤-60%"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → brittle scripts; Failed attempts → more scripts; Resolution → idempotent workflows with approvals & receipts.

### CTAs
Assessment → Demo → ROI session (ops time saved).
```

---

# Data Collector

## Product Brief — Data Collector

```markdown
---
product: collector
name: "EmpowerNow Data Collector — Inventory & Usage"
status: draft
owner: Product Marketing
personas: [Data/FinOps, Platform Engineering, Security, Compliance]
primary_outcome: "Timely, normalized identity & usage data with lineage for policy and analytics."
proof_tags: ["lineage","freshness_sla","normalization","clickhouse_kafka","inventory_graph","auditability"]
lastReviewed: 2025-09-25
---

## One-liner
A **fresh, normalized data backbone** for identity + usage, with lineage and SLAs—so **policies are accurate** and audits are fast.

## Problem
- Fragmented, stale data across systems; policy decisions made on lagging facts.
- No lineage → hard to prove where facts came from.

## What it is / Who it’s for
Collectors/connectors feeding **Kafka → ClickHouse** with lineage; exports to PDP/PIP/Analytics. For **Data/FinOps**, **Platform**, **Security**.

## Value Proposition
- **Accuracy:** policy decisions reflect current state.  
- **Auditability:** lineage by source and timestamp.  
- **Spend control:** usage feeds support budgets & trends.

## How it works
1) Connectors pull delta; normalize to canonical model.  
2) Write events with lineage; expose inventory and usage views.  
3) Feed PDP PIP and analytics dashboards.  
→ `/reference/collector/*`.

## Competitive Landscape
IGA discovery, ETL tools; few tie freshness+lineage directly to **policy** & **receipts**.

## SWOT
- **S:** Freshness SLAs, lineage, clickhouse scale.  
- **W:** Requires connector coverage.  
- **O:** FinOps + AI usage visibility.  
- **T:** General ETL pitches “good enough.”

## Objection Handling
- “We have a lakehouse”: not policy-aware, no receipts linkage.  
- “Connector sprawl”: managed catalog + schema pins.

## Demo Beats
1) Inventory freshness dashboard.  
2) Lineage trace for an entitlement.  
3) Usage → budget tie-in.

## Proof Library
- Schema & lineage → `/reference/collector/lineage.md`  
- Freshness SLAs → `/reference/collector/freshness.md`

## FAQ Seeds
- How do you ensure freshness?  
- What lineage metadata is stored?
```

## Persona Journey Brief — Data Collector (FinOps • Awareness)

```markdown
---
product: collector
persona: FinOps
journey_stage: awareness
triggers: ["Unexplained AI spend", "Bill shock", "Budget variance"]
pain_points:
  primary: "No trusted, timely usage data"
  secondary: "Cannot tie usage to policy/budgets"
decision_criteria: ["freshness","lineage","cost_to_operate"]
objections: ["We can export from providers","ETL exists"]
required_assets: ["spend_dashboard_sample","5min_demo","roi_consult"]
success_metrics: {engagement_min: 4, demo_cta: ">10%"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → blind spend; Failed attempts → CSV pulls; Resolution → governed usage backbone with lineage.

### CTAs
Benchmark your AI spend leakage → Demo → ROI on variance reduction.
```

---

# ARIA Shield

## Product Brief — ARIA Shield

```markdown
---
product: shield
name: "ARIA Shield — Zero-Token SPA & AI Gateway"
status: draft
owner: Product Marketing
personas: [Developers, Platform Engineering, Security Leader, AI Team]
primary_outcome: "Keep tokens out of the browser while enforcing budgets, streaming limits, and policy at runtime."
proof_tags: ["zero_token_spa","budget_enforcement","402_semantics","stream_caps","pdp_mapping","receipt_chain"]
lastReviewed: 2025-09-25
---

## One-liner
A **BFF security gateway** that terminates OAuth in the backend (**no browser tokens**), maps routes to PDP policy, enforces **budgets/402** and **streaming limits**, and emits **receipts**.

## Problem
- Browser tokens leak; gateways observe but rarely enforce budgets/streams.
- Auditors want proof that constraints were applied in real time.

## What it is / Who it’s for
Application-aware gateway for SPAs and AI chat. For **Devs**, **Platform**, **Security**.

## Value Proposition
- **Risk ↓:** zero-token SPA pattern (httpOnly cookies).  
- **Spend ↓:** live budget holds & 402 on exceed.  
- **Audit ↓:** cryptographic receipts per permit.

## How it works
1) Backend OAuth; httpOnly cookies; `/api/*` proxy.  
2) PDP mapping per route; enforce constraints, streaming caps.  
3) Budget hold/settle via `call_id`; receipt on permit.  
→ `/reference/shield/*`.

## Competitive Landscape
BFF/gateways; most lack **budget** semantics + **receipt** proof.

## SWOT
- **S:** Budget/streams enforcement, receipts, developer ergonomics.  
- **W:** Needs PDP/IdP alignment.  
- **O:** Zero-trust SPA mandates.  
- **T:** Gateways adding partial controls.

## Objection Handling
- “We already have a gateway”: can it **prove** enforcement with receipts and 402 semantics?  
- “Complexity”: drop-in `/api` proxy + route map to PDP.

## Demo Beats
1) Tokenless SPA login.  
2) Streaming cap enforced mid-call.  
3) 402 over-budget with clear UX + receipt.

## Proof Library
- Zero-token explainer → `/reference/shield/zero-token.md`  
- Budget semantics → `/reference/shield/budgets.md`

## FAQ Seeds
- How do 402 semantics work?  
- What’s the migration from token-in-browser?
```

## Persona Journey Brief — Shield (Developers • Consideration)

```markdown
---
product: shield
persona: Developers
journey_stage: consideration
triggers: ["Token leakage incident","SSE instability","Spend overruns"]
pain_points:
  primary: "Token risk and complex auth code"
  secondary: "No runtime budget enforcement"
decision_criteria: ["dev_effort","latency","observability"]
objections: ["Gateway sprawl","Breaking changes"]
required_assets: ["golden_path_spa","5min_demo","migration_guide"]
success_metrics: {demo_cta: ">15%", p95_latency_ms: "<50"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → token risk & spend leakage; Failed attempts → front-end SDKs; Resolution → backend-only tokens + PDP mapping + budgets.

### CTAs
Try the SPA Golden Path → Watch demo → Migration workshop booking.
```

---

# ARIA MCP Gateway

## Product Brief — MCP Gateway

```markdown
---
product: mcp
name: "ARIA MCP Gateway — Tool-Boundary Enforcement"
status: draft
owner: Product Marketing
personas: [AI Team, Security Leader, Platform Engineering, Developers]
primary_outcome: "Stop off-plan or drifted tool calls with schema pins, plan discipline, and receipts."
proof_tags: ["mcp_tool_governance","schema_pins","plan_jws","params_allowlist","egress_allowlist","receipt_chain"]
lastReviewed: 2025-09-25
---

## One-liner
At the **agent→tool boundary**, verify Passports, **enforce plan-step JWS**, **pin tool schemas**, apply **allowlists**, and produce **signed receipts**.

## Problem
- Agents call tools off-plan; tool schemas drift; observability ≠ enforcement.

## What it is / Who it’s for
MCP/HTTP PEP for **tool governance**. For **AI Teams**, **Security**, **Platform**.

## Value Proposition
- **Safety:** stop off-plan calls before execution.  
- **Integrity:** schema pins prevent silent drift.  
- **Audit:** cryptographic receipts per permit.

## How it works
1) Validate Passport & **plan JWS** step.  
2) Enforce `{schema_version, schema_hash}` pins (with grace).  
3) Params & egress allowlists; receipt on permit.  
→ `/reference/mcp/*`.

## Competitive Landscape
AI gateways, tool registries; few enforce **plan+schema** with receipts.

## SWOT
- **S:** Plan discipline + pins + receipts.  
- **W:** Requires tool catalogs/pins setup.  
- **O:** MCP adoption; regulated AI.  
- **T:** Gateways adding basic “allowlists”.

## Objection Handling
- “We already trace tools”: traces don’t **block** or **prove** integrity.  
- “Pin maintenance burden”: CURRENT+grace windows simplify rollout.

## Demo Beats
1) Off-plan call blocked with reason.  
2) Pin mismatch handled with grace message.  
3) Permit → receipt includes policy & pin hashes.

## Proof Library
- Schema pins → `/reference/mcp/schema-pins.md`  
- Plan discipline → `/reference/mcp/plan-jws.md`

## FAQ Seeds
- How are pins rolled out safely?  
- What’s the overhead on agent latency?
```

## Persona Journey Brief — MCP (AI Team • Evaluation)

```markdown
---
product: mcp
persona: AI Team
journey_stage: evaluation
triggers: ["Agent caused incident","Tool schema break","Compliance review"]
pain_points:
  primary: "Agents go off plan; tools drift"
  secondary: "No provable enforcement"
decision_criteria: ["safety","latency","tooling_effort"]
objections: ["Gateway already in place","Fear of blocking innovation"]
required_assets: ["tool_registry_quickstart","demo","migration_guide"]
success_metrics: {poc_pass: "≥90% criteria", offplan_block_rate: "≥95%"}
lastReviewed: 2025-09-25
---
### Narrative
Problem → off-plan and drift; Failed attempts → after-the-fact logs; Resolution → enforce plan & pins at boundary with receipts.

### CTAs
Import your tool schemas → Watch enforcement demo → POC with 3 risky tools.
```

---

## Final checklist & next steps

* These 12 drafts are **uniform** and **generator-ready** (front-matter first).
* If you want, I can **package them into your repo structure** (`/marketing/briefs/...`) and produce the **first pass pages** (product + primer + FAQ) from them—just say the word and share the target folder paths if they differ from the defaults above.


Got it — here’s a crisp, **equal-weight deep-research to-do list** for all six products. Each section spells out **what to collect, how to collect it, and what artifact to produce** so your briefs are truly “source of truth.”

---

# Shared research spine (do this for every product)

1. **Define scope & hypotheses**

   * Write 1–2 hypotheses about buyer pain, category, and our differentiators to test.
2. **Competitor shortlists**

   * Identify **3–6 direct** and **2–3 adjacent/substitute** competitors.
3. **SERP capture**

   * For Tier-1/2/3 keywords (business → mid → technical), log **top 20 URLs** with title, rank, angle, content type.
4. **Evidence harvesting**

   * From vendor sites, docs, pricing, release notes, case studies, analyst notes, talks, and GitHub: extract **≤25-word quotes** with URLs; record features & claims in a controlled vocabulary.
5. **Feature/claim normalization**

   * Map each vendor to capability tags (e.g., `schema_pins`, `receipt_chain`) and business claims (e.g., `audit_time_reduction`, `spend_reduction`).
6. **Pricing & packaging signals**

   * Capture visible SKUs, usage meters, overage risks, and discount cues; note whether “security” or “enterprise” is a separate add-on.
7. **Release velocity & community**

   * Track last 12 months of releases, blog cadence, GitHub commits/stars/issues; note ecosystem integrations.
8. **Win/Loss & buyer language**

   * Pull 3+ public reviews, talk transcripts, forum threads to capture **buyer phrasing**, common objections, and evaluation criteria.
9. **Analyst & media mentions**

   * Note inclusion in MQ/Wave/landscapes; summarize positioning and critique.
10. **Risk & compliance posture**

* Capture attestations (SOC2, ISO 27001), data residency claims, and audit arguments.

11. **Produce artifacts**

* **Competitor JSONs**, **SERP log CSV**, **Feature matrix**, **Battlecard notes**, **Release velocity one-pager**.

---

# Product-specific to-dos

## 1) IdP (Agent Passports)

**Goal:** Prove market demand for **agent-grade identity** (pairwise subjects, Token Exchange, delegated chains) and quantify key-sprawl risk.

* [ ] Compile **competitors**: Cloud IdPs (TE/RAR/DPoP support), agent identity add-ons, secrets managers (API-key elimination story).
* [ ] **Standards depth check**: OAuth TE (RFC 8693), RAR (RFC 9396), DPoP (RFC 9449) claims—who supports what, and how?
* [ ] **Delegation patterns**: Find public docs on actor chains / impersonation / on-behalf-of flows; capture gaps and risks called out by others.
* [ ] **Key-sprawl evidence**: Collect breach reports or audits citing shared tokens/keys; quantify typical rotation/owner overhead.
* [ ] **Integration ecosystem**: Which SDKs, languages, and providers (LLM/Vector/Tools) are officially supported?
* [ ] **Artifacts**:

  * `competitors/idp/*.json` (capabilities: `pairwise_id`, `token_exchange_rfc8693`, `rar_rfc9396`, `dpop_rfc9449`, `identity_chaining`)
  * Feature matrix tab: Standards | Delegation | SDKs | Audit proofs | Pricing signals

## 2) PDP (AuthZEN Decisions)

**Goal:** Validate need for **standard decision contracts** and **conservative merge** vs. typical OPA/RBAC/ABAC patterns.

* [ ] Compile **competitors**: PDP/ABAC/RBAC engines, service meshes with policy layers.
* [ ] **Contract comparison**: Do they return constraints/obligations? TTL? Explanations? Normalize return payloads.
* [ ] **Merge semantics**: Document how each vendor handles conflicts (union, priority, intersection); find incident postmortems citing drift.
* [ ] **Latency posture**: Gather p50/p95 decision latency claims and caching/TTL patterns.
* [ ] **Proofing**: Look for explainability UI/screens, decision replay, audit export.
* [ ] **Artifacts**:

  * `competitors/pdp/*.json` (caps: `authzen_contract`, `conservative_merge`, `obligations`, `ttl`, `pip_membership`)
  * Matrix: Contract fields | Merge rule | Explainability | Latency | Pricing

## 3) Orchestration Service (Identity Operations)

**Goal:** Establish pain around **idempotent provisioning**, approvals, retries, and clean audit linkage.

* [ ] Compile **competitors**: IGA provisioning engines, IDaaS workflows, iPaaS positioned for identity ops.
* [ ] **Idempotency claims**: Who guarantees dedupe by event/correlation IDs? Retry semantics? Partial-failure handling?
* [ ] **Approvals**: Capture multi-step approval, delegation, and policy-linked approvals (with evidence).
* [ ] **SLOs/MTTR**: Find public benchmarks, SLAs, or customer quotes on failure rates and recovery time.
* [ ] **Connector breadth**: Inventory common target systems; note “custom connector” paths & costs.
* [ ] **Artifacts**:

  * `competitors/crud/*.json` (caps: `idempotent_workflows`, `approvals`, `retries_slo`, `connectors`, `eventing`)
  * Matrix: Idempotency | Approvals | Observability | Connectors | Migration tooling

## 4) Data Collector (Inventory & Usage)

**Goal:** Prove value of **freshness + lineage** for governance and FinOps; show policy accuracy uplift.

* [ ] Compile **competitors**: IGA discovery, ETL/ELT platforms with identity focus, cloud usage collectors.
* [ ] **Freshness SLAs**: Evidence of delta syncs, near-real-time feeds, backfill strategies.
* [ ] **Lineage**: How do others record source→transform→sink? Field-level lineage? Time stamps? Tamper evidence?
* [ ] **Analytics**: What prebuilt models/dashboards exist (usage, anomalies, budgets)?
* [ ] **Cost to operate**: Infra costs, managed vs. self-hosted options, data egress implications.
* [ ] **Artifacts**:

  * `competitors/collector/*.json` (caps: `freshness_sla`, `lineage`, `normalization`, `inventory_graph`, `clickhouse_kafka`)
  * Matrix: Freshness | Lineage | Schemas | Dashboards | Operating cost

## 5) ARIA Shield (Zero-Token SPA & AI Gateway)

**Goal:** Differentiate **enforcement** (budgets, streaming caps, receipts) vs. **observation-only** gateways.

* [ ] Compile **competitors**: BFF/token handlers, zero-trust SPA gateways, API gateways pitching AI safety.
* [ ] **Token posture**: Do they truly remove tokens from browsers? Cookie strategies? SameSite/CSRF notes?
* [ ] **Budget semantics**: Any 402/overage behavior? Pre-hold/settle flows? Idempotent call IDs?
* [ ] **Streaming enforcement**: Mid-stream cutoffs, token caps, warning frames; look for SSE/WebSocket handling specifics.
* [ ] **Receipts/audit**: Any cryptographic or verifiable enforcement trails?
* [ ] **Artifacts**:

  * `competitors/shield/*.json` (caps: `zero_token_spa`, `budget_enforcement`, `402_semantics`, `stream_caps`, `pdp_mapping`, `receipt_chain`)
  * Matrix: Token model | Budgets | Streaming | Audit proof | Dev ergonomics

## 6) ARIA MCP Gateway (Tool-Boundary Enforcement)

**Goal:** Show superiority of **plan enforcement + schema pins** + **allowlists** versus logging-only AI gateways.

* [ ] Compile **competitors**: AI gateways, agent platforms with tool governance, MCP registries/catalogs.
* [ ] **Plan discipline**: Evidence of step contracts/JWS equivalents; what’s actually enforced vs. observed?
* [ ] **Schema pins**: `{version,hash}` pinning? ETag/grace windows? Rollout stories?
* [ ] **Allowlists**: Params and egress; depth of validation; error reporting UX.
* [ ] **Receipt scope**: What metadata is captured at permit (policy snapshot, pin hashes)?
* [ ] **Artifacts**:

  * `competitors/mcp/*.json` (caps: `plan_jws`, `schema_pins`, `params_allowlist`, `egress_allowlist`, `receipt_chain`)
  * Matrix: Plan enforcement | Schema pins | Allowlists | Latency overhead | Tooling effort

---

# Cross-product research tasks (apply to all six)

* [ ] **SERP strategy doc per product**

  * Tier-1/2/3 keywords, competitor content angles, winning H1/H2 patterns, schema usage (FAQ/HowTo/Product).
* [ ] **Battlecard notes v1**

  * Traps (cost/security/implementation), counters, proof assets to show, displacement/migration steps.
* [ ] **Release velocity one-pager**

  * Last 4–6 notable releases per competitor, cadence, and themes (security, governance, pricing, enterprise).
* [ ] **Pricing posture brief**

  * Where pricing hides, unit economics signals, overage risk, enterprise uplift tactics.
* [ ] **Analyst/media snapshot**

  * Mentions, quadrant/wave status, narratives to co-opt or counter.
* [ ] **Compliance posture**

  * Public attestations, regions, data handling claims, audit artifacts offered.

---

# Outputs & acceptance criteria (per product)

* **Competitor set:** ≥5 total (3–6 direct + 2–3 adjacent) with **complete JSON fields** and **evidence URLs** (✅).
* **SERP log:** CSV with top-20 for Tier-1/2/3 keyword sets (✅).
* **Feature matrix:** Single sheet comparing capabilities & claims using controlled vocab (✅).
* **Velocity brief:** 1-pager with release cadence & themes (✅).
* **Battlecard notes:** Traps, counters, proof demos, displacement steps (✅).
* **Pricing brief:** Signals + overage risks + enterprise tactics (✅).
* **Analyst/media note:** 1-pager summary with links (✅).

---

# Cadence & ownership

* **Week 1–2:** Build competitor lists, run first SERP sweeps, create JSON skeletons.
* **Week 3–4:** Fill evidence, feature matrix, velocity & pricing briefs; draft battlecard notes.
* **Monthly:** Refresh `lastFetched`, add new releases, update traps/counters; review SERP shifts.

---

If you want, I can drop starter **competitor JSON templates** and **SERP CSV headers** for each product so your team can begin filling them today.
