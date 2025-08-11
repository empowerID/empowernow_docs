---
title: Prometheus & Grafana for the BFF/PDP
---

Metrics (verified)

- BFF exposes Prometheus counters and histograms in `ms_bff_spike/ms_bff/src/metrics/__init__.py` (e.g., `par_requests_total`, `dpop_validation_failures_total`, OAuth flow timings).
- PDP client logs service call success/error with elapsed times (`src/services/pdp_client.py`).

Scraping

- Expose the BFF metrics endpoint (e.g., `/metrics`) and point Prometheus at the service.

Dashboards

- Include panels for: auth success/error rates, ForwardAuth rejections, token refresh outcomes, PDP latency, cache hit/miss when enabled.


