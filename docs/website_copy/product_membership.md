# Product — Membership Graph (Neo4j)

## Overview
Membership is the authoritative graph for user→agent delegations, capabilities, budgets/max_steps, and SaaS eligibility. It powers both issuance (IdP) and decisions (PDP) so constraints are consistent and explainable.

## PIP endpoints (read-only)
- Capabilities
  - `GET /api/v1/pip/membership/capabilities?user_id={id}&agent_id={id}`
  - Response: `{ "capabilities": ["mcp:tool:..."] }`
- Delegations
  - `GET /api/v1/pip/membership/delegations?user_id={id}&agent_id={id}&status=active`
  - Response: list of edges with `{delegation_id, status, max_steps, budget_usd, expires_at}`
- Data Scope
  - `GET /api/v1/pip/membership/data-scope?subject_id={id}&resource_type={type}`
  - Response: `{ "tenant_ids": [...], "row_filter_sql": "tenant_id IN ('...')", "column_mask": {} }`
- Step-up
  - `GET /api/v1/pip/membership/step-up?subject_id={id}`
  - Response: `{ "mfa_required": bool, "level": "strong" | "phishing_resistant" }`
- Identity chaining eligibility
  - `GET /api/v1/pip/membership/chain-eligibility?user_id={id}&agent_id={id}&tool_id={id}`
  - Response: `[ { "audience": "...", "scopes": ["..."] } ]`

## How PDP and IdP use it
- PDP: enriches evaluations with `data_scope`, `step_up`, `identity_chain`, and verifies capability for the requested tool/action
- IdP: verifies active delegation and fetches `budget`/`max_steps` to embed in the ARIA Passport; can consult tool eligibility

## Why it matters
- A single source of truth reduces drift between issuance and enforcement
- Graph queries keep constraints grounded in real relationships (tenants, projects, tool entitlements)
- PIP endpoints are fast, simple, and safe to cache

## Learn more
- Docs index: `services/membership/index`
- Reviewer's Guide: `services/membership/explanation/reviewers-guide`
- Schema & Endpoints: `services/membership/reference/schema-and-endpoints`
- Postman collection: `services/membership/reference/postman/membership_review.postman_collection.json`
