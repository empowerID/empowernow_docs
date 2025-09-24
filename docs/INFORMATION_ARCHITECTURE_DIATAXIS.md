# Information Architecture Proposal (Diátaxis)

Last updated: 2025-09-20

Goal: Normalize the produced docs under `docs/` to the Diátaxis model (Tutorials, How‑to Guides, Reference, Explanation), reduce duplication, and make slotting new content trivial. This is an actionable plan with per‑service changes.

## Principles
- One canonical place for each fact. Reference pages are the single source of truth for APIs/configs/flags.
- Keep steps in How‑to; keep why/rationale in Explanation; keep end‑to‑end onboarding in Tutorials.
- Website/Marketing pages link to technical docs; do not restate configuration tables.
- Cross‑link: Tutorials → How‑to → Reference; Explanation ↔ Tutorials, but avoid circular duplication.

## Global structure (produced docs)
- Public website: `website_copy/*` (product/solutions/SEO). High‑level only; link to services’ docs.
- Marketing: `marketing/*` (campaigns/positioning). Link into services for technical depth.
- Technical docs: `services/<service>/{explanation,how-to,reference,tutorials}`.
- SDKs: `sdks/*` (language‑specific usage). Link from service how‑tos.
- Personas/Enablement: internal guides that inform navigation and content tone.

---

## Service: BFF
Canonical index: `services/bff/index.md`

- Explanation (keep/ensure):
  - `explanation/architecture.md`, `security-model.md`, `authorization.md`, `bff_gateway.md`, `bff_gateway_technical.md`, `overview.md`, `executive-overview.md`, `fapi2-production-design.md`, `llm-dynamic-model-routing.md`, `golden-path.md`, `bff-visual-guide.md`.
  - Action: Add short TL;DR and “See also” at top of each page; ensure no step lists or config values here.

- How‑to (task pages; canonical target for step‑by‑steps):
  - `how-to/*` (59 pages). Examples: Traefik ForwardAuth, session binding, PDP mapping, routes, SPA usage, streaming.
  - Action: Remove long configuration tables duplicated from Reference; replace with links to corresponding `reference/*`.

- Reference (single source of truth):
  - `reference/config-overview.md`, `settings-reference.md`, `routes-reference.md`, `logging-reference.md`, `observability.md`, `proxy-yaml-reference.md`, `pdp-reference.md`, `pdp-mapping.md`, `frontend-errors.md`, `environment-index.md`, `idps-reference.md`, `health-metrics.md`, `fips-140-3.md`.
  - Action: Consolidate all flags/settings here; create anchors for deep‑linking from How‑to/Website.

- Tutorials (onboarding):
  - `tutorials/*` (3+ pages). Action: Ensure each tutorial links to prerequisite how‑tos and references at each step.

- DevOps:
  - `devops/bff_to_crud_mtls.md`, `experience_routing.md`, `mcp_proxy_routing.md`.
  - Action: If they contain config tables, move those tables to Reference and link back.

- Duplication fixes:
  - Gateway: keep technical truth in `explanation/bff_gateway.md` and `explanation/bff_gateway_technical.md`; website `product_gateway.md` links to these.
  - Config tables: strip from how‑tos; link to `reference/settings-reference.md`.

---

## Service: CRUD Service
Canonical index: `services/crud-service/index.md`

- Explanation/How‑to/Reference/Tutorials present.
- Secrets: `secrets/*` (internal).
- Actions:
  - Consolidate MCP configuration tables under `reference/*`; link from how‑tos.
  - Mark PDFs/internal docs as internal; ensure public pages link without copying content.
  - Add approvals content:
    - Explanation: `services/crud-service/explanation/approvals-overview.md`
    - How‑to: `services/crud-service/how-to/approver-resolvers.md` (incl. PDPSubjectSearchResolver), `services/crud-service/how-to/synonyms-and-refresh.md`
    - Reference: `services/crud-service/reference/approval-tasks-and-apis.md`
    - Operations: `services/crud-service/operations/approvals-operations.md`

---

## Service: PDP
Canonical index: `services/pdp/index.md`

- Explanation: 14 pages (policy model, integrity, architecture).
- How‑to: 4 pages (admin tasks, integration).
- Reference: 1 page (expand with flags/APIs as they stabilize).
- Actions:
  - Create `reference/settings-flags.md` as canonical for PDP flags.
  - Ensure “security/integrity” pages link to flags and runbooks without duplicating lists.

---

## Service: Membership
Canonical index: `services/membership/index.md`

- Explanation/How‑to/Reference present but sparse.
- Actions:
  - Flesh out `reference/*` with schema and API endpoints; link from explanation.

---

## Service: NowConnect
Canonical index: `services/nowconnect/index.md`

- Explanation/How‑to/Reference present.
- Actions:
  - Identify duplicated configuration across how‑tos; move to reference.

---

## Service: Experience
Canonical index: `services/experience/index.md`

- Rich set: quickstart, API reference, security, plugins, versioning.
- Actions:
  - Ensure plugin configuration lives in a single `reference/plugins-config.md`; link from plugin tutorials/how‑tos.

---

## Service: Aria Shield
Canonical index: `services/aria-shield/index.md`

- PM/executive, seven controls, capability proofs, receipts, attestation, intro architecture, patent portfolio.
- Actions:
  - Keep PM/executive pages under services; website product pages link to them.
  - Add a concise `reference/controls.md` pointing to per‑control settings in BFF/PDP reference.

---

## Website Copy (Public)
- Action: Remove any deep config tables and replace with links to service reference pages. Add “See also” blocks pointing to tutorials/how‑tos.

## Marketing (Public)
- Action: For each campaign (e.g., loopback‑mcp), add “Deeper technical docs” section linking to service how‑tos/tutorials/reference.

## SDKs
- Action: Ensure service how‑tos referencing SDKs link to `sdks/python.md` or `sdks/npm.md` instead of inlining long code samples.

---

## Cross‑linking rules
- Tutorials must link to the exact how‑to and reference anchors used in each step.
- How‑tos must link to reference pages for every configuration/flag mentioned.
- Explanation pages should end with “See also” to key tutorials and how‑tos; avoid embedding steps.
- Website/Marketing pages must link to services for technical depth.

---

## Concrete consolidation tasks (initial batch)
1) BFF: move any configuration tables from `how-to/*` into `reference/settings-reference.md` and add anchors; update how‑tos to link.
2) BFF Gateway: add a “See also” to `bff_gateway_technical.md` from website `product_gateway.md` and remove repeated tables from website page if present.
3) PDP: create `reference/settings-flags.md`; link from `services/pdp/explanation/*` and from website trust/security pages.
4) Aria Shield: add `reference/controls.md` that enumerates the seven controls with links into BFF/PDP reference pages.
5) Marketing Loopback MCP: add “Deeper technical docs” block linking to CRUD/BFF how‑tos/tutorials.

---

## Templates (per Diátaxis type)
- Tutorial: Objective → Prereqs → Steps → Verify → Next steps → Troubleshooting → Links.
- How‑to: Goal → Assumptions → Steps → Result → Links to Reference.
- Reference: Scope → Definitions → Tables (with anchors) → Examples → Versioning.
- Explanation: Problem → Concepts → Architecture → Trade‑offs → Links.

---

## Success criteria
- Zero duplicated configuration tables outside of Reference.
- Every how‑to has deep links to reference anchors for each config mentioned.
- Website/Marketing pages contain no step‑by‑step or configuration tables.
- Navigation clearly separates Tutorials, How‑to, Reference, Explanation per service.
