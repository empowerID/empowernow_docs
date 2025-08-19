---
id: index
title: Policy Decision Point (PDP) – Overview
description: PDP overview – central authorization decisions, events/metrics, and links to configuration and runbooks.
---

The PDP provides central authorization decisions across services and apps. Integrate via the BFF for consistent session boundary checks, and emit decision events/metrics for observability.

What to read next:

- PDP fundamentals: `/docs/services/pdp/explanation/overview`
- Configure and deploy: `/docs/services/pdp/how-to/configure`
- Observe decisions and health: `/docs/services/pdp/how-to/observability`
- Runbooks (403s, degraded, error spikes): `/docs/services/pdp/how-to/runbooks`

Secrets enforcement (PEP inside CRUDService):

- Executive overview: `/docs/services/crud-service/explanation/secrets-executive-overview`
- Canonical URIs and guards: `/docs/services/crud-service/how-to/secrets-canonical-uris`
- Audits and metrics: `/docs/services/crud-service/how-to/audits-and-metrics`
- YAML Vault Provider (dev‑only): `/docs/services/crud-service/how-to/yaml-vault-provider`

Related BFF topics:

- Map API routes to PDP resources/actions (pdp.yaml): `/docs/services/bff/reference/pdp-mapping`
- BFF health/metrics endpoints: `/docs/services/bff/reference/health-metrics`
- BFF observability (logs/metrics/traces): `/docs/services/bff/how-to/observability`


