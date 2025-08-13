---
id: logging-in-production
title: CRUD Service logging in production (where to look and what you'll see)
description: How to find CRUD Service logs, events, traces, and metrics in production; default log levels; masking; and relevant runtime controls.
sidebar_label: Logging in production
---

## Where to look in production

- **Container logs (primary)**: `stdout`/`stderr`.
  - Docker (host):
    - PowerShell: `docker logs crud_service`
  - Kubernetes:
    - `kubectl logs deploy/crud-service -n <namespace>`

- **Optional file logs**: if enabled and writable, under `/app/logs/app.log`.
  - Controlled by `LOG_TO_FILE` and `WORKFLOW_LOG_DIR`.
  - In many production runs the container filesystem is read‑only; expect stdout instead of files.

- **Kafka business/error events**: topics use the `KAFKA_TOPIC_PREFIX` (default `crud`). Common topics:
  - `crud.errors`, `crud.operations`, `crud.workflows`, `crud.secrets`, `crud.secrets.audit`, `crud.metrics`
  - Example (host with kcat):
    - `kcat -b <broker> -t crud.errors -C -o -10`

- **Traces**: exported to OTLP at `OTEL_EXPORTER_ENDPOINT` (default `http://otel-collector:4317`). View in your tracing UI (Jaeger/Tempo/Grafana).

- **Metrics**: scrape the service `/metrics` endpoint (Prometheus format).

## What you'll see at production log levels (default INFO)

- Structured JSON lines with masking, correlation IDs, and exceptions when present. Examples:

```json
{"timestamp":"2025-01-01T12:00:00Z","service":"my_service","environment":"prod","name":"app","level":"INFO","message":"Received execute request","correlation_id":"b1e...","system":"entraid_contractors","object_type":"user","action":"create","params":{"Password":"****MASKED****","Email":"john@example.com"},"user":"auth:account:..."}
```

```json
{"timestamp":"2025-01-01T12:00:02Z","service":"my_service","environment":"prod","name":"app","level":"ERROR","message":"HTTPException occurred: Validation failed","correlation_id":"b1e...","exception":"Traceback (most recent call last): ..."}
```

- Typical signals:
  - Startup/shutdown INFO logs (DB check, Redis/Kafka init)
  - Per‑request INFO logs on success
  - ERROR logs on `HTTPException`/unexpected exceptions (with `exc_info` stack)
  - `422` validation errors logged by the global handler

## Masking and sensitivity

- All log entries pass through masking; common secrets like passwords, tokens, `Authorization` headers are redacted.
- Route code also pre‑masks request params/headers before logging.
- Admin‑only “unmasked” logging is gated by `ADMIN_UNMASKED_LOGGING`. Ensure it’s `false` in production.

## Controls to know

- `LOG_LEVEL` (default `INFO` in prod), `FILE_LOG_LEVEL`, `LOG_TO_FILE`, `WORKFLOW_LOG_DIR`
- `KAFKA_*` (bootstrap servers, topic prefix), `OTEL_*` (collector endpoint, console debug opt‑in)

## Summary

- Check container `stdout` (`docker logs`/`kubectl logs`). Optional file: `/app/logs/app.log` if enabled and writable.
- For business/error events, read Kafka topics like `crud.errors`.
- Traces go to your OTEL backend; metrics are on `/metrics`.
- At prod (`INFO`) you’ll see masked, JSON‑structured request/response and error logs with correlation IDs and stack traces on errors.

See also: `services/crud-service/reference/kafka-events`


