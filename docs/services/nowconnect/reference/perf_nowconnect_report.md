---
id: perf-nowconnect-report
title: NowConnect LDAP Performance Results (localhost:1389)
description: "Sample performance results and SLO gates from tools/perf_nowconnect_ldap.py runs."
sidebar_label: Perf results (sample)
---

Date: 2025-08-18

Environment
- **target**: `localhost:1389` (mapped to NowConnect Cloud listener 389)
- **bind DN**: `cn=admin,dc=example,dc=org`
- **base DN**: `dc=example,dc=org`
- **SSL**: false

### Scenarios and results

Baseline (10 workers × 2 RPS, 30s, page=100, filter `(objectClass=inetOrgPerson)`)
- **requests_total**: 610; **errors_total**: 0
- **latency (ms)**: avg 59.07; p50 49.19; p90 107.34; p99 152.82; max 191.13

Run A (moderate load: 20 workers × 3 RPS, 30s, page=100)
- file: `perf_nowconnect_runA.json`
- **requests_total**: 1615; **errors_total**: 0
- **latency (ms)**: avg 368.56; p50 370.79; p90 456.14; p99 623.32; max 788.32

Run B (high concurrency: 50 workers × 2 RPS, 30s, page=100)
- file: `perf_nowconnect_runB.json`
- **requests_total**: 1495; **errors_total**: 0
- **latency (ms)**: avg 1011.40; p50 1028.19; p90 1601.24; p99 2089.19; max 3447.43

Run C (large-page search: 10 workers × 2 RPS, 30s, page=1000, filter `(objectClass=*)`, attrs `uid,cn,sn,mail`)
- file: `perf_nowconnect_runC.json`
- **requests_total**: 610; **errors_total**: 0
- **latency (ms)**: avg 136.45; p50 125.41; p90 225.83; p99 295.51; max 338.58

### Observations
- **Stability**: No errors across all runs; tunnel and premise behaved reliably.
- **Latency scaling**: Sub-200ms p99 at baseline; degrades under heavier parallelism (p99 ~0.62s for Run A and ~2.09s for Run B), consistent with upstream LDAP and tunnel backpressure.
- **Payload size**: Larger page size (Run C) increased latency vs baseline but still kept p99 < 300ms under modest load.

### Suggested SLOs and gates
- CI perf gate (baseline scenario): fail if `errors_total > 0` or `p99_ms > 200`.
- Soak/high-concurrency: track trend; raise alert if `p99_ms` regresses >20% from prior.

### How to reproduce
```powershell
python tools\perf_nowconnect_ldap.py --host localhost --port 1389 --concurrency 10 --rps-per-worker 2 --duration 30 --base-dn "dc=example,dc=org" --bind-dn "cn=admin,dc=example,dc=org" --password "admin"
```

Artifact files
- `perf_nowconnect_runA.json`
- `perf_nowconnect_runB.json`
- `perf_nowconnect_runC.json`

See also: `services/nowconnect/reference/perf_nowconnect_ldap_guide`.