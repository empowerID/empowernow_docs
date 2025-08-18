---
id: configure
title: Configure PDP (deploy and connect)
description: How to deploy/configure PDP and connect it to BFF and services.
---

## Deploy and configure

- Deploy the PDP service (container)
  - Expose `/health`, `/metrics`, and the decision API
- Configure BFF to call PDP for authorization decisions
  - Route mapping reference: `/docs/services/bff/reference/pdp-mapping`
  - Health/metrics: `/docs/services/bff/reference/health-metrics`
- Validate with health and metrics
  - `/docs/services/pdp/how-to/observability`


