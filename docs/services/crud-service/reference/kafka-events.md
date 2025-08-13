---
id: kafka-events
title: CRUD Service Kafka events (business and error)
description: Topics, payload shapes, and emission points for CRUD Service business/error events, plus guidance on consuming them for troubleshooting.
sidebar_label: Kafka events
---

## Topics used

Note: Actual topic names are prefixed by `KAFKA_TOPIC_PREFIX` (default `crud`). Examples below assume the default prefix.

- `crud.operations`: per‑command success/failure
- `crud.errors`: validation errors from `/execute` (and general error events when targeted)
- `crud.workflows`: workflow started/completed/failed
- `crud.secrets`, `crud.secrets.audit`: vault/secret retrieval successes, cache hits, errors
- `crud.metrics`: operational metrics (not errors; useful for monitoring)

## Event shapes and when they are emitted

### CRUD operation events (topic `crud.operations`)

- Emitted on both success and failure of a command.
- Payload (data):
  - `operation`: action name (for example, `create_user`)
  - `system`, `object_type`, `object_id`
  - `params`: masked parameters
  - `result`: present on success
  - `error`: present on failure (string)
  - `success`: boolean
  - `timestamp`
- Context added by producer (envelope):
  - `event_id`, `event_type` (create/read/update/delete/list)
  - `correlation_id`, `service`, `trace_id`, `span_id`, `user_context`
- Where emitted (examples):

```python
# execute_routes.py
await producer.publish_crud_operation(
  operation=execute_request.action,
  system=execute_request.system,
  object_type=execute_request.object_type,
  object_id=object_id,
  params=masked_params,
  error=str(http_exc.detail),  # on failure
  correlation_id=correlation_id,
  execution_context=ExecutionContext(request),
)
```

```python
# command_executor.py
await kafka_producer.publish_crud_operation(
  operation=action,
  system=system_name,
  object_type=object_type,
  object_id=object_id,
  params=params,
  error=str(e),  # on failure
  correlation_id=correlation_id,
  execution_context=execution_context,
)
```

### Validation error events (topic `crud.errors`)

- Emitted by the global handler when FastAPI raises `RequestValidationError` for `/execute`.
- Payload (data):
  - `path`, `errors` (FastAPI validation details)
  - `system`, `object_type`, `action`, `object_id`
- Context: `correlation_id` added by producer wrapper
- Where emitted (example):

```python
# main.py
await producer.publish_event(
  event_type="validation_error",
  data=data,
  correlation_id=str(getattr(request.state, "correlation_id", "")) or None,
  topic=producer.topics.get("errors"),
  execution_context=None,
)
```

### Workflow events (topic `crud.workflows`)

- Emitted when a workflow starts and when it completes/fails/waits.
- Payload (data):
  - `workflow_name`, `step_name` (optional), `status`, `error` (on failure), `metadata`, `started_by`, `timestamp`
- Where emitted (example):

```python
# final_executor.py
await producer.publish_workflow_event(
  event_type=evt,
  workflow_name=self.workflow_name,
  status=self.context.status.value,
  correlation_id=self.context.id,
  started_by=self.context.started_by_arn,
)
```

### Secret/vault events (topics `crud.secrets` and `crud.secrets.audit`)

- Emitted on cache hits, successful retrievals, and errors when fetching secrets from vault providers.
- Payload (data):
  - `vault_type`, `credential_id`, `success`, `error` (on failure), `cached`, `timestamp`
- Emitted to both functional and audit topics.
- Where emitted (examples):

```python
# vault_service.py (error path)
await producer.publish_secret_event(
  event_type=EventType.SECRET_ERROR,
  vault_type=vault_type,
  credential_id=pointer.credential_id,
  success=False,
  error="Vault strategy not found",
)
```

```python
# crud_producer.py (audit fan‑out)
await self.publish_event(
  event_type=event_type,
  data=data,
  topic=self.topics["secrets_audit"],
  # ...
)
```

## Masking and PII

- Parameters are masked before being passed to the producer; sinks also mask sensitive fields.
- Secrets and headers are sanitized by callers. `credential_id` is included as‑is; secret values are never included.

## Correlation and tracing

- Each event includes a `correlation_id` (request or workflow id).
- If OpenTelemetry is active, `trace_id` and `span_id` are attached.
- `user_context` carries subject/issuer when available.

## Example event (failure on `crud.operations`)

```json
{
  "event_id": "...",
  "event_type": "update",
  "timestamp": "...",
  "correlation_id": "b1e-...",
  "service": "crud-service",
  "trace_id": "...",
  "span_id": "...",
  "user_context": {"unique_id": "...", "subject": "auth:account:...", "issuer": "..."},
  "data": {
    "operation": "update",
    "system": "entraid_contractors",
    "object_type": "user",
    "object_id": "E123456",
    "params": {"Password": "****MASKED****", "Email": "john@example.com"},
    "error": "Validation failed: missing field 'LastName'",
    "success": false,
    "timestamp": "..."
  }
}
```

## Consuming for troubleshooting

- CRUD failures: read `crud.operations` filtering where `success=false` or `error` present; group by `correlation_id` or `object_id`.
- Validation problems: read last N from `crud.errors`.
- Workflow issues: read `crud.workflows` where `status=FAILED` or an `error` is present.
- Vault issues: read `crud.secrets` and `crud.secrets.audit` where `success=false`.

Examples (host with kcat):

```bash
kcat -b <broker> -t crud.errors -C -o -10
kcat -b <broker> -t crud.operations -C -o -10 | jq 'select(.data.success==false)'
```


