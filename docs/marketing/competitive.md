---
title: Competitive Landscape
description: How we compare vs OPA/Cedar, Auth0/Okta, and Zapier/Make/n8n.
---

Authorization (OPA/Cedar):

- We implement OpenID AuthZEN; native delegation graphs; built‑in explainability; CAEP/OTEL; p95 < 20 ms with caching

Authentication (Auth0/Okta):

- Zero‑token BFF model; CAEP across services; self‑host option; integrated PDP for consistent authZ at the edge

Automation (Zapier/Make/n8n):

- PDP‑authorized node execution with DPoP proof and CAEP audit; enterprise observability; on‑prem connectivity via Azure Relay



## PDP competitors (AuthZ engines)

### Aserto (AuthZEN‑aligned PDP)

- What they say/do: Co‑proposers/co‑chairs of OpenID AuthZEN WG; native implementation positioning; public interop demos with multiple vendors. Source: [Aserto AuthZEN overview](https://www.aserto.com/lp/authzen).
- Strengths:
  - Clear alignment with OpenID AuthZEN and PEP↔PDP model; credible standards advocacy
  - Developer‑friendly API and cloud‑managed offering; strong story for app‑level externalized authZ
- Risks/constraints vs our Fabric:
  - Focused on PDP, not a full identity fabric (no BFF/session termination pattern, no Studios, no automation/inventory plane)
  - Operational surface limited to authorization; broader observability/CAEP coverage varies by integration
- Where we win:
  - End‑to‑end, PDP‑guarded platform (Studios, BFF, Automation/Inventory) with zero‑token SPAs and CAEP/analytics by default
  - Runtime module activation and plugin model across UI, not only service‑side decisions

### Cerbos (open‑source PDP + Cerbos Hub)

- What they say/do: Externalized, policy‑based, runtime authorization; open‑source PDP with enterprise Hub. Source: [Cerbos](https://www.cerbos.dev/).
- Strengths:
  - Proven open‑source footprint; fast to embed; familiar ABAC/RBAC policy model; good developer tooling
  - Self‑host + managed options; success stories and partner ecosystem
- Risks/constraints vs our Fabric:
  - Emphasis on PDP, not AuthZEN interop positioning across the board; no BFF/session termination or UI runtime model
  - Analytics, CAEP‑style events, and hybrid connectivity depend on customer assembly
- Where we win:
  - Standards‑first (AuthZEN) across the fabric with built‑in CAEP/observability and hybrid connectivity patterns
  - Unified Studios + BFF + Data plane with policy gates on every call

### Permit.io (AuthZ as a Service)

- What they say/do: Managed authorization service, policy & permissions management, developer SDKs. Source: [Permit.io](https://www.permit.io/).
- Strengths:
  - Rapid developer onboarding and UI for roles/permissions; hosted management plane
  - Bridges RBAC→ABAC use cases for app teams
- Risks/constraints vs our Fabric:
  - Vendor‑managed control plane introduces lock‑in concerns for some enterprises
  - Not a fabric: lacks BFF, Studios, automation/inventory, and end‑to‑end observability out of the box
- Where we win:
  - Composable, self‑hostable or SaaS fabric that standardizes AuthN/AuthZ/Automation with evidence (events/metrics/traces)

### Axiomatics (enterprise ABAC; AuthZEN narrative)

- What they say/do: Long‑standing ABAC vendor; public narrative embracing AuthZEN era. Source: [Axiomatics AuthZEN era](https://axiomatics.com/blog/introducing-the-era-of-authorization-with-authzen).
- Strengths:
  - Mature ABAC and fine‑grained policy history in large regulated enterprises
  - Clear thought leadership on centralized authorization
- Risks/constraints vs our Fabric:
  - Historically XACML‑centric estates can be complex to operate and modernize for cloud‑native
  - Not a full identity fabric; lacks our BFF pattern, Studios, real‑time UI runtime and plugin model
- Where we win:
  - Modern, standards‑driven AuthZEN across UI and service calls, with zero‑token SPAs and policy‑guarded automation

## IdP competitor (AuthN with AuthZEN awareness)

### Curity (standards‑focused IdP; AuthZEN learning resources)

- What they say/do: High‑assurance OIDC/OAuth provider; publishes resources on AuthZEN concepts. Source: [Curity AuthZEN learning](https://curity.io/resources/learn/authzen/).
- Strengths:
  - Strong standards posture (OIDC/OAuth; often FAPI‑aligned) and security credibility
  - Enterprise‑grade IdP feature set; good developer docs
- Risks/constraints vs our Fabric:
  - IdP‑first scope; customer must assemble PDP, BFF, CAEP, automation/inventory to reach “fabric” outcome
  - No unified Studios or runtime UI activation
- Where we win:
  - Identity Fabric that unifies IdP+BFF+PDP+Automation/Inventory with built‑in eventing/analytics and UI runtime

---

Notes

- We should expect continued consolidation and convergence on OpenID AuthZEN semantics and discovery. Competitors in PDP will strengthen interop stories rapidly; our advantage is a provable end‑to‑end fabric with BFF‑mediated zero‑token SPAs, Studios, and CAEP/observability baked in.
- Keep this honest: for app‑only teams that “just need decisions,” a specialized PDP (Aserto/Cerbos/Permit.io) can be the fastest path. Our differentiation matters when buyers want one control plane for AuthN+AuthZ+Automation+Inventory with runtime UI, hybrid connectivity, and measurable evidence.