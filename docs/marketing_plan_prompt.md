Perfect—here’s your **final, equal-weight plan** that is (1) heavy on **market research**, (2) produces **amazing, detailed briefs** for **each** product (IdP, PDP, CRUD Service, Data Collector, ARIA Shield, ARIA MCP Gateway), and (3) turns those briefs into the **single source of truth** for all website content.

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

### CRUD Service

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

If you want, I can immediately **draft the six Product Brief skeletons** (IdP, PDP, CRUD Service, Data Collector, ARIA Shield, ARIA MCP Gateway) plus **one Persona Journey Brief** for each, so your generator can produce the first pass of pages right away.
