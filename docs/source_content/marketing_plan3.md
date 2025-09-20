I’ll quickly open the IdP and Membership design docs to extract their AI-specific features for inclusion in the positioning.

[3 tools called]

I reviewed the IdP, PDP, and Membership (Neo4j) design docs and pulled the AI-specific capabilities we should highlight alongside the Gateway/BFF story.

### What’s uniquely powerful in IdP
- **ARIA Passports via Token Exchange (RFC 8693)**: RAR-first authorization_details with tools, schema pins, budgets; optional PAR+JARM; PoP binding with DPoP (`cnf.jkt`).
- **Pairwise identities and actor chain (OBO)**: `sub` and `act.sub` pairwise by sector; eliminates cross-tenant/linkability and gives clean audit actors.
- **Plan contracts (JWS) and schema integrity**: Signed plan JWS + tool schema pins sourced from Tool Registry; protects step order and request/response shapes at issuance.
- **Identity chaining (feature-flagged)**: Short‑TTL assertion minting and brokered exchanges; IdP enforces PDP’s `constraints.identity_chain` (allowed audiences/scopes, TTL caps).
- **Discoverability and verifiability**: Updated discovery, JWKS (plan key exposure), and ARIA claims docs endpoints for transparency.

Impact:
- Moves agent governance “left” into identity. You don’t just authenticate agents—you mint verifiable, least‑privilege agent passports with plan/budget/shape controls, and gate identity chaining by policy.

### What’s uniquely powerful in PDP (with Membership PIP)
- **AuthZEN‑profiled evaluation with constraints/obligations**: Standard `/access/v1/evaluation` returning nested constraints and obligations; decision cache; batch eval.
- **Membership PIP fusion**: PDP calls Membership to compute:
  - `data_scope` (tenant_ids, row_filter_sql; column mask)
  - `step_up` MFA hints
  - `identity_chain` allowlists (audiences/scopes, TTL)
  - capability check for requested tool/action
- **Application‑scoped, most‑restrictive merges**: Cataloged merges for tokens/egress/params/data_scope; operator pack (URL host, phrase checks).

Impact:
- Centralizes runtime authorization with graph‑derived context, so constraints are authoritative, composable, and explainable.

### What’s uniquely powerful in Membership (Neo4j)
- **Delegation-as-graph**: Authoritative edges for user→agent delegations, capabilities, budgets, max_steps, expiries.
- **Governance APIs for control plane**: PIP endpoints for capabilities, active delegations, data‑scope, step‑up, identity‑chaining eligibility.
- **Single truth powering both IdP and PDP**: IdP embeds budgets/max_steps into passports; PDP derives constraints from the same graph.

Impact:
- A consistent “source of truth” for delegation, capability, and data boundaries that both issuance (IdP) and enforcement (PDP/PEP) trust.

### Why this triad is hard for others to match
- Hyperscalers (Cloudflare/AWS/Azure): great safety filters and observability; do not mint agent passports with plan/pins/budgets, nor enforce identity-chaining via PDP.
- IAM suites (Okta/Ping/Saviynt/SailPoint/CyberArk): strong identity governance and PAM; limited agent‑specific passports, MCP tool pins, plan JWS, or PEP‑grade constraints with receipts.
- Policy engines (Axiomatics/PlainID/Permit.io/Cerbos): powerful PDPs; not shipping an integrated IdP+PDP+Graph pattern with MCP schema pins, budgets, and cryptographic receipts.

### Updated positioning (include IdP/PDP/Membership explicitly)
- EmpowerNow ARIA is an Identity Fabric for AI agents:
  - Identity: IdP mints ARIA Passports (RAR, DPoP, pairwise, plan JWS, schema pins); optional identity chaining gated by PDP.
  - Authorization: PDP (AuthZEN) returns constraints/obligations sourced from policy and Membership graph.
  - Execution: MCP Gateway/BFF enforce constraints (egress, params, budgets, steps) and emit cryptographic receipts.
- Short copy for site/briefs:
  - “Mint verifiable agent identities with budgets, plans, and schema pins at the IdP.”
  - “Authorize with a standard (AuthZEN), enriched by a live delegation graph.”
  - “Enforce at the boundary: MCP-aware PEP + cryptographic receipts.”

### Demo storyline (expand beyond Gateway/BFF)
- IdP: PAR+JARM consent; Token Exchange → ARIA Passport with DPoP, plan JWS, schema pins, budget.
- PDP: Same request shows `data_scope`, `step_up`, `identity_chain` from Membership; deny when capability missing.
- Membership: Flip a delegation edge/budget → observe immediate effect in IdP issuance and PDP constraints.
- Gateway/BFF: Enforce plan step, budget 402, egress/params deny; show signed receipt chain.

### Quick content updates to make now
- Add “ARIA IdP” and “Membership Graph PIP” sections to ARIA landing; link to `________newdesign10_idp.md` and Membership doc.
- Expand the PDP section with “Membership-powered constraints” examples (data_scope SQL, identity_chain TTL).
- Append an “Identity chaining” explainer (delegated vs brokered) with PDP gating and short TTLs.
- Publish “Agent Passports” doc excerpting ARIA claim fields and examples (`call_id`, `schema_pins`, `plan_jws`, `budget`, `cnf.jkt`).

If you want, I can draft the ARIA landing sections and a 1‑page “Agent Passports” explainer pulling from `________newdesign10_idp.md`, PDP + Membership PIP examples, and update marketing copy accordingly.