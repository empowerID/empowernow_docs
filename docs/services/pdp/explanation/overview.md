---
id: overview
title: PDP Overview
description: What the PDP does, how decisions flow, and where to integrate.
---

The Policy Decision Point (PDP) evaluates authorization policies and returns allow/deny decisions along with obligations/advices as needed. Integrate via the BFF or directly from services that require centralized authorization.

Decision flow at a glance:

- SPA → BFF `/api/...` → BFF maps path/method → `resource`/`action` (+ optional `id`/`props`)
- BFF calls PDP with subject, resource, action, context
- PDP returns allow/deny (+ obligations) → BFF enforces and logs/metrics

Read next:

- Configure PDP: `/docs/services/pdp/how-to/configure`
- PDP route mapping in BFF: `/docs/services/bff/reference/pdp-mapping`
- Observability: `/docs/services/pdp/how-to/observability`


