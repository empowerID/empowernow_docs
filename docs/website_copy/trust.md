---
title: Trust
description: Security, compliance, and privacy posture for the marketing site.
---

## Security

- Zero‑token SPAs: No tokens in the browser. Policy enforced at the BFF.
- Transport & token hygiene: FAPI/DPoP, PKCE/PAR/JARM; mTLS where applicable.
- Edge control: ForwardAuth at the ingress; per‑call PDP decisions.
- Evidence: Structured logs, metrics, traces, and CAEP events on every path.

Learn more: /docs/marketing/identity-fabric-standards, /docs/services/bff/explanation/bff_gateway

## Compliance

- Standards alignment: OIDC, OpenID AuthZEN, CAEP/Shared Signals.
- Crypto posture: FIPS considerations and modern cipher suites.
- Operational guardrails: rotation, incident runbooks, and health/metrics.

Learn more: /docs/marketing/identity-fabric-standards

## Privacy & data residency

- Deployment models: SaaS and self‑managed, including dedicated tenancy/VPC.
- Isolation & access: Tenant isolation and least‑privilege operational access.
- Auditability: Exportable audit trails and dashboards for internal/external review.


