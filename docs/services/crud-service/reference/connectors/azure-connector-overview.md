---
id: azure-connector-overview
title: Azure (Microsoft Graph) connector – reliability, scalability, admin depth
description: "Overview of the upgraded Azure connector: resiliency, observability, standardized responses, new admin commands, configuration, and examples."
sidebar_label: Azure connector overview
---

## Overview

We upgraded the Azure (Microsoft Graph) connector for reliability, scalability, and admin depth, and standardized its outputs with AD/LDAP. This page summarizes changes, new capabilities, configuration, and examples.

## Key improvements

- Resilience and performance
  - Keyed global rate limiting per scope (for example, base_url/tenant) via `max_concurrent_requests`.
  - Centralized retry/backoff with jitter; honors `Retry-After` in seconds, milliseconds, and HTTP-date.
  - Granular httpx timeouts (connect/read/write/pool) instead of a single timeout.
  - Streaming pagination helper and automatic page following when needed; preserves `@odata.deltaLink`.
  - Batch API wrapper with standardized responses and rate limiting.
- Observability
  - Optional request/response logging with masking; configurable detail level.
  - OpenTelemetry span for page collection.
- Consistency
  - Standardized connector response shape across Azure/AD/LDAP.
  - Unified error propagation from the HTTP layer (includes response headers for `Retry-After`).

## New/expanded admin capabilities (system YAMLs)

See detailed coverage: `services/crud-service/reference/connectors/entra-admin-coverage`.

- Users: revoke sessions; auth methods list/delete; manager operations; direct reports; transitive memberships; member groups; user photo.
- Groups: `groups/delta`, transitive members/memberOf, `getMemberGroups`.
- Applications and Service Principals: owners add/remove; credentials add/remove; service principal password add.
- Administrative Units and Roles: AU membership; AU-scoped role assignments; directory role assignments/definitions.
- Directory Objects: bulk `getByIds`.
- Devices: enable/disable; owners list/add/remove; user-owned/registered devices.
- B2B invitations: create invitations.
- Batch API: submit multiple Graph calls in one HTTP request.

## Behavior changes and standardization

- Standard response shape (envelope) for all connectors:

```json
{
  "response": {
    "success": true,
    "data": {},
    "meta": {}
  }
}
```

- Retries
  - The HTTP layer can be run in “no-retry” mode; the Azure wrapper performs retries to avoid double retry.
  - Honors `Retry-After` (seconds, -ms, or HTTP-date), throttling appropriately.

- Concurrency
  - `max_concurrent_requests` applies per scope (for example, per base_url/tenant), preventing cross-tenant contention.

- Pagination
  - Helper provides streaming iteration and/or automatic collection; preserves `@odata.deltaLink` for resyncs.

## Configuration (connection-level)

Add these under the Azure system’s `connection`:

- Rate limiting
  - `max_concurrent_requests` (int, default 4): concurrency per scope.
- Retries
  - `retry.max_attempts` (int, default 3)
  - `retry.backoff_base` (float seconds, default 0.1)
  - `retry.backoff_factor` (float, default 2.0)
  - `retry.jitter` (float seconds, default 0.1)
  - Honors `Retry-After` headers automatically.
- Timeouts (httpx.Timeout)
  - `timeouts.connect` (float seconds)
  - `timeouts.read` (float seconds)
  - `timeouts.write` (float seconds)
  - `timeouts.pool` (float seconds)
- Logging (optional)
  - `logging.enabled` (bool)
  - `logging.request` (bool)
  - `logging.response` (bool)
  - `logging.auth` (bool)  // masked
  - `logging.format` ("basic" | "detailed")

Example:

```yaml
connection:
  auth_type: azure
  credentials:
    client_id: ${{ENV:...}}
    client_secret: ${{ENV:...}}
    tenant_id: ${{ENV:...}}
    resource: "https://graph.microsoft.com/"
    grant_type: "client_credentials"
  base_url: "https://graph.microsoft.com/v1.0"
  max_concurrent_requests: 6
  retry:
    max_attempts: 4
    backoff_base: 0.2
    backoff_factor: 2.0
    jitter: 0.1
  timeouts:
    connect: 2.0
    read: 20.0
    write: 10.0
    pool: 2.0
  logging:
    enabled: true
    request: true
    response: false
    auth: false
    format: detailed
```

## Batch API usage

- Command (in Azure YAMLs); see detailed examples: `services/crud-service/reference/connectors/entra-graph-batch-examples`.

```yaml
graph:
  schema_mapping: graph_misc
  commands:
    batch:
      endpoint: "/$batch"
      method: POST
      headers:
        Content-Type: "application/json"
      body:
        requests: "{{ params.requests | tojson }} asjsonobject"
```

## Gov cloud considerations

- Use `base_url: "https://graph.microsoft.us/v1.0"` and `resource: "https://graph.microsoft.us/"`.
- Owner `$ref` bodies must use the US domain; tests validate this.

## Testing (highlights)

- Unit tests validate:
  - Retry/backoff and `Retry-After` handling
  - Keyed rate limiting
  - Timeout construction
  - Streaming pagination
  - Batch API
  - Admin command URLs and bodies (users, groups, apps/SPs, AUs, directoryObjects, devices, invitations)
  - Gov-specific owner `$ref` body host

See also:

- `services/crud-service/reference/connectors/entra-admin-coverage`
- `services/crud-service/reference/connectors/entra-graph-batch-examples`


