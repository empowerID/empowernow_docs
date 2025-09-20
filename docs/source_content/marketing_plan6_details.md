### Goals and guardrails
- Outcomes: drive demo requests, pilot signups, content engagement, analyst coverage.
- KPIs: demo CTR, quickstart CTR, page dwell time, blog subscriber growth, analyst briefings booked, pilots started.
- Guardrails: consistent 5-pillar narrative (Identity, Authorization, Enforcement, Truth Graph, Orchestration).

### Global IA and URL map
- Top nav:
  - Product (/product)
  - Solutions (/solutions)
  - Docs (/docs)
  - Resources (/resources)
  - Pricing (/pricing)
  - Company (/company)
  - Book a demo (/demo)
- Secondary:
  - Trust & Security (/trust)
  - Partners (/partners)
  - Blog (/blog)
  - Whitepapers (/resources/whitepapers)
  - Webinars (/resources/webinars)

### Homepage TOC (/)
- Hero: “Make AI agents safe, affordable, orchestrated, and auditable”
- Social proof: logos, quotes
- The 5 Pillars (overview):
  - Identity (IdP)
  - Authorization (PDP)
  - Enforcement (MCP Gateway + BFF)
  - Truth Graph (Membership)
  - Orchestration (Self‑Driving Workflows)
- Architecture snapshot: IdP → PDP → Gateway/BFF → Tools, backed by Membership; Receipts
- Demo strip: 3-card flows (deny-before-call, budget cap, zero‑shot workflow)
- Outcomes by role (CISO, CFO, Platform, DevSecOps)
- Integrations: Model providers, SaaS, SIEM/Observability
- Trust & compliance highlights
- CTAs: Book a demo | Try quickstart | Watch 10‑min demo

### Product hub TOC (/product)
- What is ARIA (Identity Fabric + Self‑Driving Workflows)
- Standards alignment (AuthZEN, OAuth TE/OBO, RAR, DPoP, MCP)
- Components overview with deep-link cards:
  - IdP (Agent Passports)
  - PDP (AuthZEN + Membership PIP)
  - ARIA Gateway (MCP PEP)
  - BFF Spending Control
  - Tool Registry
  - Receipt Vault
  - Orchestration (Automation Studio + CRUD Service)
  - Membership (Neo4j)
- Comparison: ARIA vs “AI Gateways” vs “AuthZ engines” vs “Workflow tools”
- CTAs: Book a demo | Read docs

### Product subpages (detailed TOCs)
- IdP — Agent Passports (/product/idp)
  - Overview: RAR/DPoP, pairwise identities, plan JWS, schema pins
  - Identity chaining (delegated/brokered)
  - Discovery/JWKS, claim reference (aria_extensions)
  - Security model: DPoP, JTI replay caching
  - CTAs: See claims example | Docs | Demo

- PDP — AuthZEN + Membership PIP (/product/pdp)
  - AuthZEN evaluation model; constraints/obligations
  - Membership-powered constraints: data_scope, step_up, identity_chain
  - Policy merge (most‑restrictive) and operator pack
  - Performance and TTL cache
  - CTAs: Evaluation examples | Policy guide | Docs

- ARIA Gateway (MCP PEP) (/product/gateway)
  - Schema pins + rollout window, params allowlists, egress allowlists
  - Identity binding, plan-step checks, budget gating
  - Obligation execution: receipts, analytics
  - CTAs: MCP request example | Docs | Demo

- BFF Spending Control (/product/bff)
  - Stream-time enforcement, token/leakage caps
  - Budget hold/settle, 402 behavior, receipts
  - Provider compatibility (OpenAI/Anthropic/Azure)
  - CTAs: API example | Docs | Demo

- Tool Registry (/product/registry)
  - CURRENT/pin semantics, signed pins (optional), ETag caching
  - Admin flows: publish, flip, grace window
  - CTAs: Pin format | Admin guide | Docs

- Receipt Vault (/product/receipts)
  - Signed, hash-chained receipts; optional KMS anchoring
  - What’s recorded: policy snapshot, params hash, lineage
  - CTAs: Receipt schema | Viewer demo | Docs

- Orchestration — Self‑Driving Workflows (/product/orchestration)
  - Executive summary: no‑code tools/workflows, zero‑shot agent execution
  - LLM‑Native Next Path Generation (global)
  - Node‑centric decisions and consequences
  - AI‑native visuals with Mermaid (full + node diagrams)
  - EnhancedWorkflowResponse: next_paths, node_specific_next_paths, ai_context, domain_insights
  - Start/resume flow; zero‑shot detection
  - Guardrails: PDP constraints, plan/budget, receipts
  - CTAs: Start a workflow | See response specimen | Docs

- Membership Graph (Neo4j) (/product/membership)
  - Delegations, capabilities, budgets/max_steps, SaaS eligibility
  - PIP endpoints; consistency across IdP and PDP
  - CTAs: PIP shapes | Docs | Diagram

### Solutions hub and pages (/solutions)
- Hub: segment cards (FinOps, Regulated, SaaS platforms, DevSecOps)
- FinOps governance (/solutions/finops)
  - Problem → ARIA solution (budget enforcement, receipts)
  - ROI and controls; pilot outline
  - CTA: Book a FinOps demo
- Regulated industries (/solutions/regulatory)
  - Data_scope, step_up, receipts; audit workflows
  - CTA: Compliance demo
- SaaS platform teams (/solutions/saas)
  - MCP governance, identity chaining, egress pinning
  - CTA: Platform demo
- DevSecOps (/solutions/devsecops)
  - Policy-as-code, PEP enforcement, observability
  - CTA: Quickstart

### Docs landing (marketing entry) (/docs)
- Quickstart (compose + sample tools + workflow)
- API references: PDP, MCP gateway, BFF, Registry, Receipts, IdP identity chaining
- Guides: Agent Passports, Self‑Driving Workflows, AuthZEN mapping, Receipts viewer
- Links to developer docs site (if separate)

### Resources (/resources)
- Blog (/blog): categories (Agents, AuthZEN, Orchestration, FinOps)
- Whitepapers (/resources/whitepapers): ARIA overview, Orchestration
- Webinars (/resources/webinars): on-demand, upcoming
- Demos (/resources/demos): 10‑min and deep dive
- Analyst brief (/resources/analyst-brief)

### Pricing (/pricing)
- Tiers: Community, Team, Enterprise
- Feature matrix by pillar
- FAQ and contact
- CTAs: Talk to sales | Start pilot

### Trust & Security (/trust)
- Security model summary (DPoP, pairwise, receipts)
- Compliance roadmap and attestations
- Responsible AI stance
- CTAs: Security whitepaper

### Company (/company)
- About, leadership, careers
- Press/newsroom
- Contact

### Conversion flows
- Primary: Book a demo (short form; calendaring)
- Secondary: Try quickstart (repo + guide) | Watch 10‑min demo | Download whitepaper
- Tertiary: Subscribe to blog | Join webinar | Contact sales

### SEO and schema
- Core keywords (by pillar): AuthZEN PEP, AI agent authorization, MCP gateway, agent spending control, cryptographic receipts, no‑code AI workflows, zero‑shot orchestration
- Per‑page meta: title (≤60 chars), meta description (≤155 chars), H1/H2 alignment
- Structured data: Organization, Product, FAQ, Article, VideoObject (demo)

### Asset and content production (by page)
- Homepage: 1 architecture diagram, 5 pillar icons, 1 demo gif, 3 testimonial quotes
- Each product page: 1 detailed diagram, 1 code/request specimen, 1 CTA block, FAQs
- Orchestration page: 2 Mermaid examples, JSON response specimen, short screencast
- Solutions: 1 diagram, ROI bullets, 1 CTA each
- Whitepaper: ARIA + Orchestration (10–12 pages)
- Demo video: 10 minutes; deny-before-call → budget cap → zero‑shot workflow

### Analytics and experimentation
- Events: nav clicks, hero CTAs, demo form submits, quickstart clicks, video plays
- Funnels: homepage → product hub → product page → demo form
- A/B: homepage hero headline, CTA copy, architecture placement

### Governance and cadence
- Owners: Marketing (site copy), Product (technical accuracy), Design (assets), DevRel (docs samples)
- Review SLA: 48 hours; change log per page
- Update cadence: weekly blog; monthly webinar; quarterly whitepaper

### 8‑week execution plan (detailed)
- Week 1
  - Finalize IA; draft homepage + product hub copy; design system; asset list
- Week 2
  - Build homepage and product hub; write IdP/PDP/Gateway pages (draft); implement CTAs
- Week 3
  - Write Orchestration and Membership pages; add Registry/Receipts pages; diagrams
- Week 4
  - Solutions pages; Pricing; Trust; Resources hub; route wiring; SEO/meta
- Week 5
  - Quickstart and guides; code/specimens; demo video script; analytics events
- Week 6
  - Demo video production; whitepaper v1; blog #1 (AuthZEN PEP)
- Week 7
  - Blog #2 (Enforced budgets) and #3 (Self‑Driving Workflows); webinars scheduling
- Week 8
  - Analyst brief; pilot collateral; A/B on hero; launch

This plan gives you a complete sitemap with page-level TOCs, copy sections, assets, CTAs, SEO, analytics, and an 8‑week build schedule.