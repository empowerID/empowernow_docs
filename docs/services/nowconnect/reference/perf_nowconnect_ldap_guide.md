---
id: perf-nowconnect-ldap-guide
title: NowConnect LDAP Performance Runner – Guide
description: "How to run tools/perf_nowconnect_ldap.py, all settings, and how to interpret and gate results."
sidebar_label: Perf runner guide
---

This document explains the performance test runner `tools/perf_nowconnect_ldap.py`: what it measures, how to run it across environments, all settings, and how to interpret and gate results for DevOps, QA, and Docs teams.

## Overview

- **Purpose**: Generate concurrent LDAP search traffic through NowConnect (Cloud→tunnel→Premise→OpenLDAP) and report latency distribution, throughput, and errors.
- **Core metrics**: p50/p90/p99/max latency, average latency, total requests, total errors.
- **Traffic path (host-mode example)**: Client → `localhost:1389` → NowConnect Cloud listener (389) → WebSocket tunnel (8765) → NowConnect Premise → OpenLDAP (389).

## Prerequisites

- Python 3.10+
- Package: `ldap3` (install if needed)

```bash
pip install ldap3
```

Repo path of the runner:
- `CRUDService/tools/perf_nowconnect_ldap.py`

## Quick start

Run a 30-second baseline against the NowConnect Cloud listener mapped to localhost:1389.

```powershell
python tools\perf_nowconnect_ldap.py --host localhost --port 1389 --concurrency 10 --rps-per-worker 2 --duration 30 --base-dn "dc=example,dc=org" --bind-dn "cn=admin,dc=example,dc=org" --password "admin"
```

```bash
python tools/perf_nowconnect_ldap.py --host localhost --port 1389 \
  --concurrency 10 --rps-per-worker 2 --duration 30 \
  --base-dn 'dc=example,dc=org' --bind-dn 'cn=admin,dc=example,dc=org' --password 'admin'
```

Output is printed to stdout and saved as JSON (default `perf_nowconnect.json`).

## CLI reference (and environment variables)

- **--host** (env: `NC_HOST`, default: `localhost`): Target host; use `nowconnect-cloud` inside the compose network.
- **--port** (env: `NC_PORT`, default: `1389`): Target port; host-mapped to Cloud listener 389.
- **--ssl** (env: `NC_SSL`, default: `false`): Enable LDAPS; use with port 1636 if mapped.
- **--bind-dn** (env: `LDAP_BIND_DN`, default: `cn=admin,dc=example,dc=org`): Bind DN.
- **--password** (env: `LDAP_PASSWORD`, default: `admin`): Bind password.
- **--base-dn** (env: `LDAP_BASE_DN`, default: `dc=example,dc=org`): Search base DN.
- **--filter** (env: `LDAP_FILTER`, default: `(objectClass=inetOrgPerson)`): LDAP filter.
- **--attrs** (env: `LDAP_ATTRS`, default: `uid,cn,sn`): Comma-separated attribute list.
- **--scope** (env: `LDAP_SCOPE`, default: `sub`): `base` | `one` | `sub`.
- **--page-size** (env: `LDAP_PAGE`, default: `100`): Page size for paged search control.
- **--concurrency** (env: `NC_CONCURRENCY`, default: `10`): Number of parallel workers (one LDAP connection per worker).
- **--rps-per-worker** (env: `NC_RPS_PER_WORKER`, default: `2`): Target rate per worker (best-effort pacing).
- **--duration** (env: `NC_DURATION`, default: `30`): Duration in seconds.
- **--timeout** (env: `NC_TIMEOUT`, default: `10`): Connect and receive timeout (seconds).
- **--out** (env: `NC_OUT`, default: `perf_nowconnect.json`): Output JSON file path.

## Output format

The runner prints and writes a JSON summary like:

```json
{
  "run_id": "<uuid>",
  "target": {"host": "localhost", "port": 1389, "ssl": false},
  "workload": {
    "concurrency": 10,
    "rps_per_worker": 2.0,
    "duration_s": 30,
    "page_size": 100,
    "scope": "sub",
    "filter": "(objectClass=inetOrgPerson)",
    "attributes": ["uid", "cn", "sn"]
  },
  "latency_ms": {"count": 610, "avg_ms": 59.1, "p50_ms": 49.2, "p90_ms": 107.3, "p99_ms": 152.8, "max_ms": 191.1},
  "requests_total": 610,
  "errors_total": 0,
  "start_iso": "2025-08-18T01:20:39Z"
}
```

### Viewing results

- Plain read: open the JSON file.
- With `jq` (bash):

```bash
jq '.latency_ms, {requests: .requests_total, errors: .errors_total}' perf_nowconnect.json
```

## Common scenarios

- **Baseline** (moderate):
  - `--concurrency 10 --rps-per-worker 2 --duration 30 --page-size 100`
- **Higher throughput**:
  - `--concurrency 20 --rps-per-worker 3` (approx 60 RPS)
- **High concurrency**:
  - `--concurrency 50 --rps-per-worker 2` (approx 100 RPS)
- **Large page / broader filter**:
  - `--page-size 1000 --filter '(objectClass=*)' --attrs 'uid,cn,sn,mail'`
- **LDAPS**:
  - `--ssl --port 1636` (ensure port is mapped and certificates are configured)

## Running locations

- **Host against compose-mapped ports** (recommended for local): `--host localhost --port 1389`.
- **Inside compose network** (e.g., from a container): `--host nowconnect-cloud --port 389`.

Compose snippets of interest:
- Cloud listener: `nowconnect-cloud` binds 389; compose maps `1389:389`.
- Premise agent connects to Cloud via `NC_AGENT_URL=ws://nowconnect-cloud:8765/tunnel` and targets OpenLDAP.

## CI integration (Azure Pipelines example)

Add a perf step and gate on SLO:

```yaml
- task: PythonScript@0
  displayName: Run NowConnect perf baseline
  inputs:
    scriptSource: inline
    script: |
      python tools/perf_nowconnect_ldap.py --host localhost --port 1389 \
        --concurrency 10 --rps-per-worker 2 --duration 30 \
        --base-dn "dc=example,dc=org" --bind-dn "cn=admin,dc=example,dc=org" --password "admin" \
        --out perf_nowconnect.json
      python - << 'PY'
      import json, sys
      with open('perf_nowconnect.json','r') as f:
          d=json.load(f)
      p99=d['latency_ms']['p99_ms']
      errs=d['errors_total']
      print(f"p99={p99}ms errors={errs}")
      # Gate: p99 <= 200ms and no errors
      sys.exit(0 if p99 <= 200 and errs == 0 else 1)
      PY
  continueOnError: false

- publish: perf_nowconnect.json
  artifact: nowconnect-perf
```

## HA and resilience checks

To simulate a connector disruption during a run:

```bash
# Start a longer run in one shell
python tools/perf_nowconnect_ldap.py --host localhost --port 1389 --concurrency 20 --rps-per-worker 3 --duration 120

# In another shell, restart the premise after ~30s
docker compose -f docker-compose-nowconnect.yml restart nowconnect_premise
```

Expect brief latency spikes and minimal or no errors if the tunnel recovers quickly.

## Interpreting results

- **Latency percentiles**: p50 (typical), p90 (tail), p99 (worst-case under load). Track p99 over time.
- **Throughput**: `requests_total / duration_s` approximates actual RPS achieved.
- **Errors**: Should be 0 under healthy conditions; investigate connection/cert/DN issues if non-zero.

## Suggested SLOs (local baseline)

- `errors_total == 0`
- `p99_ms <= 200` (baseline:
  10×2 RPS, page=100)

## Troubleshooting

- "invalid server address": Use `--host localhost --port 1389` (host-mode) or `--host nowconnect-cloud --port 389` (in-network).
- LDAPS handshake errors: ensure certificates are configured; try `--ssl --port 1636` only if mapped.
- Timeouts: increase `--timeout`, reduce `--rps-per-worker` or `--concurrency`.
- Bind errors: verify `--bind-dn` and `--password`.

## Security notes

- The examples use admin DN for convenience. Use a least-privilege service account for routine perf checks.

## Related files

- Runner: `CRUDService/tools/perf_nowconnect_ldap.py`
- Sample report: `CRUDService/tools/perf_nowconnect_report.md`
- Compose: `CRUDService/docker-compose-nowconnect.yml`
- Cloud config: `ServiceConfigs/NowConnect/config/cloud.yaml`

See also: `services/nowconnect/how-to/operational-validation-health` and `services/nowconnect/explanation/metrics-and-reliability`.