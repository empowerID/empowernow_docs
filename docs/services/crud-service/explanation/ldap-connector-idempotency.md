---
id: ldap-connector-idempotency
title: LDAP connector idempotency for group membership updates
description: Treat benign LDAP result codes as success to reduce flakiness in retries and high‑churn operations.
sidebar_label: LDAP connector idempotency
---

## Context

Connector: `CRUDService/src/connectors/ldap_connector.py`

Group membership updates often re‑apply adds/removes under retries or concurrent workflows. Some LDAP servers return benign errors when the desired state already exists.

## Behavior change

- In `update_group_members`:
  - Treat result code **16 (noSuchAttribute)** on delete as success
  - Treat result code **20 (typeOrValueExists)** on add as success
  - Log at `INFO` level with a concise message

This makes repeated adds/removes idempotent, reducing false‑negative failures in tests and production.

## Why

- Improves reliability for retry‑heavy or concurrent operations
- Matches intent: desired end state rather than one‑shot mutation

## Notes

- Scope is limited to group membership adds/deletes. Extend cautiously to other modify operations where safe and expected.
- Ensure dashboards/alerts focus on actual failures rather than these benign outcomes.

See also:

- `services/nowconnect/explanation/metrics-and-reliability`


