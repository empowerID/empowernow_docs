---
title: Monitoring & Alerts (Experience Plugins)
sidebar_label: Monitoring & Alerts
description: PromQL/LogQL examples and alerting thresholds for plugin serve outcomes, allow-list violations, and quarantine events.
---

## Metrics (suggested)

- `plugin_bundle_serve_ms{tenant,plugin_id,version}` (histogram)
- `plugin_allowlist_violations_total{tenant,plugin_id}` (counter)
- `plugin_quarantine_status{tenant,plugin_id}` (gauge 0/1)

## PromQL examples

- p95 bundle serve latency per plugin:

```promql
histogram_quantile(0.95, sum(rate(plugin_bundle_serve_ms_bucket[5m])) by (le, plugin_id))
```

- Violation rate (> 5/min):

```promql
sum(rate(plugin_allowlist_violations_total[1m])) by (plugin_id) > 5
```

- Any quarantine active:

```promql
max_over_time(plugin_quarantine_status[5m]) == 1
```

## LogQL (Loki)

```logql
{app="bff", level="warn"} |= "X-Allowlist-Violation" | unwrap plugin_id | count_over_time([5m])
```

## Alerts (suggested)

- Violation spike: warn at >5/min, crit at >20/min (per plugin)
- Latency: p95 bundle serve > 500ms sustained 10m
- Quarantine: any plugin in quarantine (notify ops immediately)

See also: Ops Runbook `./ops-runbook`, CI/CD Cookbook `./cicd-cookbook`.

