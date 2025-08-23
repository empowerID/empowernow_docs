---
title: Fabric + IGA — How We Complement SailPoint and Saviynt
description: Where governance stays in IGA, where runtime policy moves to the Fabric, and integration patterns to get both.
---

## Why combine an Identity Fabric with IGA?

Analyst view: Identity Fabrics integrate IGA, Access Management, and runtime authorization into a cohesive, standards‑based control plane spanning cloud and on‑prem. IGA stays authoritative for lifecycle, certifications, and SoD; the Fabric enforces runtime policy at the edge. Source: [KuppingerCole Identity Fabrics](https://www.kuppingercole.com/research/lc80893/identity-fabrics).

## Keep in IGA (sources of truth)

- Joiner‑Mover‑Leaver lifecycle (HR → accounts → deprovision)
- Access requests, approvals, campaigns, periodic certifications
- Segregation of Duties (SoD) policies and toxic combinations
- Role/entitlement catalogs and attestation evidence

References: [SailPoint](https://www.sailpoint.com/), [Saviynt](https://saviynt.com/)

## Move to the Fabric (runtime enforcement)

- PDP (OpenID AuthZEN) decisions for subject/resource/action at every API call (via BFF)
- Zero‑token SPAs (no browser tokens); policy at the server boundary
- Policy‑guarded Automation/Inventory nodes (DPoP proofs, CAEP events)
- Event‑native observability: OTEL traces, Prometheus metrics, Loki logs, Grafana/Jaeger

## Integration patterns

- Identity data: ingest identities/roles via SCIM or connectors; map roles → AuthZEN attributes for decisions
- Requests/approvals: call out to IGA for approval workflows; enforce grants at runtime in the BFF/PDP
- Evidence: stream CAEP/Shared‑Signals‑style events and PDP decisions to analytics; export attestation‑ready logs to IGA
- SoD at runtime: check SoD outcome as AuthZEN attributes/obligations before executing high‑risk actions

```mermaid
flowchart LR
  IGA[IGA (SailPoint/Saviynt)
  lifecycle / campaigns / SoD] -->|SCIM / roles / grants| BFF[BFF]
  BFF -->|AuthZEN evaluate| PDP[PDP]
  BFF --> AUTO[Automation]
  BFF --> INV[Inventory]
  PDP --> EVT[CAEP / Analytics]
  AUTO --> EVT
  INV --> EVT
```

## RACI (simplified)

- IGA: Account lifecycle (R), access requests (R), certifications (R), SoD definition (R)
- Fabric: Runtime enforcement (R), analytics/telemetry (R), hybrid connectivity (R)
- Shared: Entitlement modeling (C), policy mapping (A), incident response (C)

## Migration playbook

1) Read‑only sync from IGA → Fabric; map roles → AuthZEN attributes
2) Put BFF in path; enforce low‑risk decisions first; enable CAEP/telemetry
3) Gate high‑risk actions with PDP; add SoD checks at runtime
4) Shift Automation/Inventory jobs under PDP with DPoP + audit events
5) Publish dashboards for auditors (decisions, approvals, exceptions)

## Proof you can show

- AuthZEN discovery doc exposed by PDP
- Zero‑token request traces (edge → BFF → PDP → service) with decision ids
- CAEP events correlated to approvals/certifications
- SoD runtime blocks visible in dashboards

This approach preserves IGA’s governance strengths while giving teams provable, real‑time enforcement at the boundary.


