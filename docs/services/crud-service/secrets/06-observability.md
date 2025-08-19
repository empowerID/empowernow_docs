---
title: Observability
description: Audits, metrics, and traces for secrets flows
---

Auditing

- Kafka topics: `crud.secrets`, `crud.secrets.audit`
- Records include `resource_ref` HMAC (non‑leaky) when `TENANT_SALT` set

Metrics

- Prometheus counters/histograms for decisions, provider calls, errors

Traces

- OTel spans across PEP → PDP → provider; correlation IDs in logs and events


