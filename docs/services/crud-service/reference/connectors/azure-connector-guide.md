---
id: azure-connector-guide
title: Azure (Microsoft Graph) connector – capabilities and configuration
description: "Production‑grade Graph client in CRUD Service with retries, pagination, observability, flexible config, and standardized responses."
sidebar_label: Azure connector guide
---

The Azure connector in CRUD Service provides a production‑grade Microsoft Graph client with robust retries, pagination, observability, and flexible configuration. It’s implemented in `src/connectors/azure_connector.py`.

## What it does

- Authenticates to Microsoft Graph using either a bearer token or client credentials (via a credential manager).
- Executes HTTP actions based on a command definition: method, endpoint, params, body, headers.
- Adds advanced query headers for Graph features like `$search` and `$count`.
- Automatically follows `@odata.nextLink` (auto‑pagination) with an opt‑out.
- Supports batch requests (`$batch`).
- Provides OpenTelemetry spans, metrics, and structured error mapping.
- Rate‑limits client‑side to protect against throttling.

## Configuration (system‑level)

Provide a dictionary to the connector when constructing, typically via YAML in `config/systems/*.yaml` or programmatically. All keys are optional unless noted.

- `base_url` (string)
  - Default: `https://graph.microsoft.com/v1.0` (use `.../beta` if needed)
- `auth_type` (string)
  - Supported: `azure` (client credentials), `bearer` (static token)
  - Required for production flows: `azure`
- `token` (string)
  - Only when `auth_type == "bearer"`
- `credentials` (object; for `auth_type == "azure"`)
  - `client_id` (required), `client_secret` (required), `tenant_id` (required), `resource` (optional)
- `default_content_type` (string; default `application/json`)
- `max_concurrent_requests` (int; default 4) – global semaphore limit
- `rate_limit_key` (string; default `base_url`) – scope for the global rate limiter
- `timeouts` (object) – maps to httpx.Timeout: `connect/read/write/pool` in seconds
- `retry` (object)
  - `max_attempts` (default 4)
  - `backoff_base` (s, default 0.5)
  - `backoff_factor` (default 2.0)
  - `jitter` (s, default 0.1)
  - `retry_on_status` (default `[408,429,500,502,503,504]`)
  - `retry_after_header_names` (default `["retry-after","x-ms-retry-after-ms","retry-after-ms"]`)
  - Honors `Retry-After` headers automatically
- `logging` (object)
  - `enabled`, `request`, `response`, `auth`, `format` ("basic" | "detailed"). Sensitive headers are masked.
- `auto_paginate` (bool; default true)

## Command configuration (per‑call)

The `command_config` defines a call you pass to `perform_action`.

- `method` (required): `GET|POST|PATCH|PUT|DELETE`
- `endpoint` (required): e.g., `/users`, `/groups/{id}`
- `params` (object, optional): querystring map, e.g. `{ "$top": 5, "$search": "\"displayName:Admin\"" }`
- `body` (object, optional): JSON payload for POST/PATCH/PUT
- `headers` (object, optional): merged with auth/default headers
  - Auto‑sets `client-request-id` and default `Content-Type`
- `auto_paginate` (bool, optional): override connector default

Notes:

- For GET/DELETE, `params` is sent, and `body` is not.
- For POST/PATCH/PUT, `body` is sent as JSON.

## Advanced query auto‑detection

If the query uses advanced features, the connector sets:

- Header: `ConsistencyLevel: eventual`
- Param: `$count=true`

Detected keywords: `$search`, `$filter`, `$count`, `$orderby`, `ne`, `not`, `endsWith`.
You can also force advanced mode via params/headers.

## API surface

- `perform_action(object_type, action, params, command_config, transaction_id=None, expected_outcomes=None, correlation_id=None, timeout=60.0)` → standardized response
  - Returns dict where data is at `result["response"]["data"]`
- `iter_pages(url, headers, timeout, correlation_id)` → async iterator of page dicts
- `perform_batch(requests, correlation_id=None, timeout=60.0, prefer=None, continue_on_error=False)` → standardized response
- `close()` – closes the shared httpx client

## Observability

- OpenTelemetry
  - Spans: `azure.perform_action` (and internal `azure.collect_pages`)
- Metrics (custom)
  - `azure.perform_action.duration`: histogram per method/action
  - `azure.semaphore.wait.duration`: histogram for rate limiter waits
  - `azure.request.retry.delay`: histogram per status
  - `azure.request.retry.attempts`: histogram
  - `azure.http_429`: counter

## Error handling and resilience

- All `httpx.HTTPStatusError` are mapped into FastAPI `HTTPException` with:
  - `status_code`: HTTP status
  - `detail`: `{ "error": "HTTP Error <code>", "upstream": { "url": "...", "detail": <upstream JSON> } }`
- Retries
  - Enabled for statuses in `retry_on_status`
  - Honors `Retry-After` headers (including `x-ms-retry-after-ms`)
- Token refresh
  - Ensures auth headers are present and not expiring soon; refreshes within 5 minutes of expiry

## Rate limiting

- Global `asyncio.Semaphore` keyed by `rate_limit_key` bounds concurrency.
- Set `max_concurrent_requests` to adjust throughput.

## Pagination behavior

- When `auto_paginate` is enabled and `@odata.nextLink` is present, subsequent pages are fetched and returned as a consolidated dict:

```json
{ "value": [/* all items */], "@odata.deltaLink": "<last delta link if present>" }
```

- To fetch only a single page:
  - Set `command_config.auto_paginate = false`
  - Use `$top` to reduce page size

## Examples

- Minimal GET:

```python
result = await connector.perform_action(
  object_type="user",
  action="get_one",
  params={},
  command_config={"method": "GET", "endpoint": "/users?$top=5"},
)
users = result["response"]["data"]
```

- Advanced search:

```python
result = await connector.perform_action(
  object_type="user",
  action="search",
  params={},
  command_config={
    "method": "GET",
    "endpoint": "/users",
    "params": {"$search": "\"displayName:Admin\"", "$count": "true"},
    "headers": {"ConsistencyLevel": "eventual"},
  },
)
```

- Create user:

```python
create_cmd = {
  "method": "POST",
  "endpoint": "/users",
  "body": {
    "accountEnabled": True,
    "displayName": "SDK Test",
    "mailNickname": "sdktest",
    "userPrincipalName": "sdktest@contoso.com",
    "passwordProfile": {"forceChangePasswordNextSignIn": True, "password": "P@ssw0rd123!"},
  },
}
result = await connector.perform_action("user", "create", {}, create_cmd)
user = result["response"]["data"]
```

- Single page only (no auto‑pagination):

```python
single_page_cmd = {
  "method": "GET",
  "endpoint": "/users",
  "params": {"$top": 5},
  "auto_paginate": False,
}
result = await connector.perform_action("user", "list", {}, single_page_cmd)
```

- Batch:

```python
out = await connector.perform_batch(
  requests=[
    {"id": "1", "method": "GET", "url": "/users?$top=1"},
    {"id": "2", "method": "GET", "url": "/groups?$top=1"},
  ],
  continue_on_error=False,
)
assert out["response"]["success"] is True
```

## Authentication patterns

- Bearer token (testing)
  - `auth_type: "bearer"`
  - `token: "<access_token>"`
- Client credentials (recommended)
  - `auth_type: "azure"`
  - `credentials: { client_id, client_secret, tenant_id, resource? }`
  - Relies on credential manager and vault service to securely load and cache tokens

## Request header defaults

- `client-request-id`: correlation ID per call
- `Content-Type`: `default_content_type` when not provided
- `ConsistencyLevel: eventual` auto‑added for advanced queries if not set

## Standardized response shape

All methods return a standardized dict; the actual data is at `result["response"]["data"]`. For batch, `result["response"]["success"]` summarizes success.

## Performance and tuning tips

- For smoke tests/dashboards, set `auto_paginate: false` with small `$top` to avoid large scans.
- Increase `max_concurrent_requests` cautiously; Graph limits apply (~16 req/s per app).
- Tune `timeouts` and `retry` based on network latencies and Graph behavior.

## Common operational gotchas

- `$search` requires `ConsistencyLevel: eventual`. The connector often adds this automatically; you can also set it explicitly in headers.
- Device owners: some tenants return 400 for `/devices/{id}/owners` on Device objects. Use `/devices/{id}/registeredOwners` instead.
- License assignment requires a `usageLocation`: set user `PATCH { "usageLocation": "US" }` before `assignLicense`.
- Audit logs require `AuditLog.Read.All` (app‑only). Without it, Graph returns 403.
- Invitations require `User.Invite.All`. Without it, Graph returns 401/403.

## Security, secrets, and tokens

- Integrates with `CredentialManager` and `VaultService` to resolve credentials and cache tokens.
- Tokens are refreshed when close to expiry.
- Sensitive headers are masked in logs.

## Testing notes

- Unit tests: see `tests/connectors/test_azure_connector.py`
- Integration tests (live):
  - `tests/integration/test_entraid_contractors_eid_live.py`
  - `tests/integration/test_entraid_contractors_eid_extended.py`

## Changelog highlights

- Per‑command `auto_paginate` with connector‑level default
- Improved advanced query detection and automatic header/param enrichment
- Enhanced retry with configurable status list and `Retry‑After` handling
- More robust token refresh and default header merging

See also:

- `services/crud-service/reference/connectors/azure-connector-overview`
- `services/crud-service/reference/connectors/entra-admin-coverage`
- `services/crud-service/reference/connectors/entra-graph-batch-examples`


