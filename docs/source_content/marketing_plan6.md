### Unified message (add the Orchestration pillar)
- EmpowerNow ARIA: the Identity Fabric and Self‑Driving Workflows for AI Agents. Mint verifiable agent identities, authorize with a standard, enforce at the boundary, orchestrate no‑code agent tools and workflows, and prove every action.

- Pillars (now 5):
  - Identity (IdP): ARIA Passports (RAR/DPoP), pairwise identities, plan JWS, schema pins, identity chaining (policy‑gated).
  - Authorization (PDP): AuthZEN decisions with constraints/obligations, enriched by Membership graph (data scope, step‑up, chaining).
  - Enforcement (Gateways): MCP‑aware PEP + BFF spending control; schema/param/egress allowlists; plan+budget enforcement; cryptographic receipts.
  - Truth Graph (Membership): Delegations, capabilities, budgets/max_steps, SaaS eligibility; single source powering IdP and PDP.
  - Orchestration (Automation Studio + CRUD Service): No‑code AI agent tool creation and Self‑Driving Workflows: zero‑shot LLM‑native path generation, node‑centric decisions, AI‑native Mermaid diagrams, enhanced responses (ai_context), resumable executions.

### Public site IA and content map (updated)
- Homepage
  - Hero + subtext + CTAs
  - 5 Pillars (Identity, Authorization, Enforcement, Truth Graph, Orchestration)
  - Outcomes: deny‑before‑call, enforced budgets, no‑code agent tools, cryptographic receipts
  - Architecture snap + demo CTA
- Product
  - ARIA Overview (end‑to‑end)
  - IdP: Agent Passports and Identity Chaining
  - PDP: AuthZEN + Membership‑powered constraints
  - ARIA Gateway (MCP) and BFF spend control
  - Tool Registry and Receipt Vault
  - Orchestration (Self‑Driving Workflows)
    - Executive summary: zero‑shot, LLM‑native orchestration
    - No‑code builder (Automation Studio): design tools/workflows visually; publish as APIs
    - How it works:
      - LLM‑Native Next Path Generation (`generate_next_paths_for_workflow`)
      - Node‑centric decisions (`generate_next_paths_for_node`)
      - AI‑native visuals (Mermaid via `generate_execution_mermaid`)
      - Enhanced responses (`EnhancedWorkflowResponse` with `next_paths`, `node_specific_next_paths`, `ai_context`)
      - Zero‑shot start + resumable execution (`/start`, `/resume/{task_id}`)
    - Value: ship agent tools/workflows in minutes; reduce integration friction; shared human/AI understanding
    - Security: PDP constraints/egress/params guardrails applied; receipts on execution
- Solutions
  - FinOps governance, Regulated industries, SaaS platform teams
  - New: Agentic automation (no‑code workflows, zero‑shot execution, governance baked‑in)
- Docs
  - Quickstart (compose + example workflows)
  - API: Workflows (`/start`, `/resume/{task_id}`) and response shapes
  - Guides: “Self‑Driving Workflows”, “Mermaid for AI agents”, “Zero‑shot execution”, “Orchestration + AuthZEN”
- Resources
  - Blog series including “Self‑Driving Workflows: zero‑shot orchestration for AI agents”
  - Whitepaper + demo video
  - Analyst brief

### Homepage copy (updated)
- Headline: Make AI agents safe, affordable, orchestrated, and auditable
- Subtext: EmpowerNow ARIA mints verifiable agent identities, authorizes with AuthZEN, enforces at the boundary, and adds Self‑Driving Workflows so agents can execute no‑code tools and workflows with zero prior context.
- Pillars:
  - Identity, Authorization, Enforcement, Truth Graph, Orchestration (Self‑Driving Workflows)
- CTAs: Book a demo | Try the quickstart | Watch the 10‑min demo

### Orchestration page highlights (copy blocks)
- What it is: A no‑code agent tool and workflow platform with LLM‑native guidance, decisions, and visual understanding.
- Key capabilities:
  - Zero‑shot: Enhanced responses with `ai_context` (instructions, constraints, success_criteria, allowed_decisions)
  - LLM‑native planning: `generate_next_paths_for_workflow` and `generate_next_paths_for_node`
  - AI‑native visuals: full + per‑node Mermaid with status and edge condition labels
  - Resumable flows: `/start` and `/resume/{task_id}` maintain context and refresh next paths
  - Guardrails: PDP constraints (params/egress/data_scope/step_up), budgets/plan enforcement, receipts
- Outcomes: faster time‑to‑tool, fewer integration steps, safer automation, shared human/AI “map” of process

### Demo storyline (expanded)
- Start a workflow via `/start` with minimal input (zero‑shot) → returns `mermaid_full`, `next_paths`, `node_specific_next_paths`, `ai_context`.
- Agent chooses a decision; PDP enforces constraints; Gateway/BFF enforce params/egress/plan/budget.
- Resume via `/resume/{task_id}`; diagram and next paths update; signed receipt emitted on each step.

### SEO and CTAs (additions)
- Keywords: no‑code AI agent builder, AI orchestration platform, self‑driving workflows, zero‑shot workflows, LLM‑native workflow, Mermaid workflows, agent tool builder
- CTAs: “Build a workflow in 2 minutes”, “Generate an AI‑native process diagram”, “Start zero‑shot execution”

### Launch plan (delta to 60‑day plan)
- Weeks 1–2
  - Add Orchestration pillar to homepage and ARIA landing
  - Publish “Self‑Driving Workflows” guide + API docs + example workflow
- Weeks 3–4
  - Blog posts: zero‑shot execution; Mermaid for agents; node‑centric decisions
  - 10‑min demo section showing `/start` → `next_paths` → `/resume` with PDP enforcement + receipts
- Weeks 5–6
  - Pilot: no‑code onboarding workflow (identity + approvals) with receipts and budget guardrails
  - Analyst brief addendum: “AI‑native orchestration layer” and zero‑shot differentiation

### Competitive differentiation (short)
- Others offer safety filters, PDPs, or generic workflow tools. ARIA unifies agent identity + AuthZEN authorization + boundary enforcement with a no‑code, AI‑native orchestration layer (zero‑shot planning, node decisions, Mermaid visuals) and cryptographic receipts—governed end‑to‑end.

- Added Orchestration as the 5th pillar and updated the IA, homepage copy, solution/product pages, demo, SEO/CTAs, and launch tasks to feature Self‑Driving Workflows (zero‑shot, LLM‑native path generation, Mermaid visuals, enhanced responses, and resumable execution).