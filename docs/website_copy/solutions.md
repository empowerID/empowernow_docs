---
title: Solutions
description: Solution pages for zero‑token SPAs, AuthZEN centralization, secure automation, hybrid, analytics.
---

## Zero‑token SPAs (BFF)

Eliminate access tokens from browsers. Our BFF terminates sessions, enforces policy at the edge, and proxies APIs.

- Why it matters: Removes an entire class of token exfiltration risks and reduces client complexity.
- How it works: Session cookies, ForwardAuth, per‑call AuthZEN decisions at the BFF.
- Learn more: /docs/marketing/identity-fabric-standards, /docs/services/bff/explanation/bff_gateway

## Centralize Authorization (AuthZEN)

Standardize authorization decisions with OpenID AuthZEN. One PDP, interoperable decisions, explainable outcomes.

- Why it matters: No more per‑app policy silos; one observable decision plane.
- How it works: BFF as PEP calls PDP; decisions cached with safe TTLs; CAEP events emitted.
- Learn more: /docs/marketing/authzen-pdp, /docs/marketing/identity-fabric-standards

## Secure No‑Code Automation

Ship automations that security approves. Every node is policy‑gated, with DPoP proofs and full audit.

- Why it matters: Replace brittle scripts and shadow IT with governed workflows.
- How it works: CRUD Service + PDP; NowConnect for on‑prem; OTEL traces for every run.
- Compare: /docs/marketing/automation-vs-zapier-make-n8n

## Hybrid Connectivity (NowConnect)

Connect to on‑prem without inbound ports. Cloud hub + premise agents using Azure Relay patterns.

- Why it matters: Secure ingress‑free connectivity; consistent policy and audit.
- How it works: Connector runtime, least‑privilege, observable tunnels.
- Learn more: /docs/services/nowconnect/index

## Audit‑Ready Analytics

Turn decisions and actions into evidence. CAEP events, structured logs, metrics, and traces flow to analytics.

- Why it matters: Prove least privilege and speed audits with ready‑made dashboards.
- How it works: Kafka→ClickHouse, OTEL/Prometheus/Loki/Jaeger.
- Learn more: /docs/marketing/identity-fabric-standards

## Fabric + IGA

Keep governance (lifecycle, certifications, SoD) in IGA; enforce runtime policy in the Fabric.

- Why it matters: Faster delivery with provable controls; auditors get runtime evidence.
- How it works: SCIM/roles from IGA → PDP attributes; BFF enforces; CAEP + dashboards exported back.
- Learn more: /docs/marketing/fabric-plus-iga, /docs/marketing/competitive


