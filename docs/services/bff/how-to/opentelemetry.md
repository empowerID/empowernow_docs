---
title: OpenTelemetry — Traces and Correlation
---

The BFF sets up telemetry in `ms_bff_spike/ms_bff/src/observability/telemetry.py`. Enable the exporter endpoint and sampling to forward traces to your collector.

Steps

1) Configure exporter endpoint and headers in env (OTLP/HTTP or gRPC)
2) Start the collector and confirm the BFF connects
3) Correlate by propagating `X-Correlation-ID` (already used in PDP client calls)

Validation

- Verify spans appear for `/auth/*` and `/api/*` routes and PDP service calls.


