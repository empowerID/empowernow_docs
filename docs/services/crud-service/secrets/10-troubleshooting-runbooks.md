---
title: Troubleshooting and runbooks
description: Common errors, decision failures, provider issues, and recovery
---

Symptoms and fixes

- 403 SECRET_AUTHZ_FAILED
  - Check PDP policy and purposes; confirm Canonical URI and tenant guards
- 501 provider not supported
  - Ensure provider strategies enabled and KVv2 engine for OpenBao/HashiCorp
- Reads return 404 for fragment
  - Verify fragment exists in KV payload (or YAML map in dev)
- Destroy/undelete errors
  - Use proper versions array; confirm path has KVv2 metadata

Operational checks

- Metrics dashboards: provider latency, error rates
- Kafka audits: filter by `resource_ref`, correlate with trace IDs


