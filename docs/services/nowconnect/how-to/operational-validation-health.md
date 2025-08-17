---
id: operational-validation-health
title: NowConnect operational validation and health guide
description: Runbook for DC Ops and DevOps/SRE to validate NowConnect end‑to‑end, check health endpoints, read metrics, and troubleshoot common issues.
sidebar_label: Operational validation & health
---

### Audience

DC Ops and DevOps/SRE teams supporting NowConnect in the empowernow stack.

## What NowConnect is (in this stack)

- Cloud hub service: `nowconnect-cloud` (WS endpoint on port 8765; TCP listeners that accept client traffic, e.g., LDAP on 389).
- Premise agent service: `nowconnect-premise` (maintains WS tunnel to the cloud hub and forwards TCP to the actual target).
- Connector mapping: listener `addomain` forwards to `openldap` (config: `ServiceConfigs/NowConnect/config/cloud.yaml`).
- Validation target in this doc: OpenLDAP via the NowConnect tunnel.

## Quick “ping-pong” validation (end-to-end)

Run these anytime to prove the data path and quantify traffic. Commands are PowerShell‑friendly.

1) Ensure the services are up

```powershell
cd C:\source\repos\CRUDService
docker compose -f docker-compose-nowconnect.yml up -d nowconnect-cloud nowconnect-premise openldap
```

2) Sanity logs (cloud and agent)

```powershell
docker compose -f docker-compose-nowconnect.yml logs --tail 100 nowconnect-cloud
docker compose -f docker-compose-nowconnect.yml logs --tail 100 nowconnect-premise
```

Expect to see:

- cloud: `listener_started` on 0.0.0.0:389 with connector `addomain`, then `agent_connected`, then `connection open`.
- agent: “connecting to cloud”, “connection open”.

3) Generate tunnel traffic (read‑only LDAP search via the gateway)

```powershell
docker compose -f docker-compose-nowconnect.yml run --rm `
  -e OPENLDAP_URL=ldap://nowconnect-cloud -e OPENLDAP_PORT=389 `
  -e OPENLDAP_BASE_DN=dc=example,dc=org `
  -e OPENLDAP_USERNAME=cn=admin,dc=example,dc=org `
  -e OPENLDAP_PASSWORD=admin -e OPENLDAP_SSL=false `
  crud-service pytest tests/integration/test_openldap_readonly_extended.py::test_anonymous_bind_search -q
```

- This connects to host `nowconnect-cloud`, which proves the path goes through the tunnel (not directly to `openldap`).

4) Verify traffic counters (Prometheus metrics from cloud hub)

- The metrics endpoint is exposed on the cloud hub process (port 8765). From inside the container:

```powershell
docker compose -f docker-compose-nowconnect.yml exec nowconnect-cloud sh -lc `
"python - <<'PY'
import urllib.request
d = urllib.request.urlopen('http://localhost:8765/metrics', timeout=3).read().decode()
for l in d.splitlines():
    if l.startswith('nowconnect_tcp_connections_total') or l.startswith('nowconnect_tcp_bytes_total'):
        print(l)
PY"
```

Expect counters like:

```
nowconnect_tcp_connections_total{connector="addomain"} N
nowconnect_tcp_bytes_total{direction="c2a",connector="addomain"} X
nowconnect_tcp_bytes_total{direction="a2c",connector="addomain"} Y
```

- Re‑run the LDAP test; the bytes counters should increase (c2a = client→agent; a2c = agent→client).

## Health endpoints and what “good” looks like

- Cloud hub:
  - HTTP: `GET /healthz` → `{"status":"ok"}` (on port 8765 in‑container)
  - WebSocket: `/tunnel` (agent connects here; presence is visible in logs)
  - Metrics: `GET /metrics` (Prometheus exposition; see counters above)
- Agent: lifecycle visible in logs (“connecting to cloud”, “connection open”).

Recommended Prometheus scrape (internal network):

```yaml
- job_name: 'nowconnect'
  static_configs:
    - targets: ['nowconnect-cloud:8765']
  metrics_path: /metrics
```

## Operational runbook

### Fast diagnostic checklist

- Is the listener up?
  - Cloud logs contain: `listener_started` with the expected bind/connector.
- Is the agent connected?
  - Cloud logs contain: `agent_connected` (agent_id: dev-agent-1; connectors: ["addomain"]).
- Is traffic flowing?
  - Run the LDAP test via `nowconnect-cloud` host (above).
  - Confirm counter deltas on:
    - `nowconnect_tcp_connections_total{connector="addomain"}`
    - `nowconnect_tcp_bytes_total{direction="c2a|a2c",connector="addomain"}`

### Common failure signatures and actions

- Cloud log `no_agent_for_connector`:
  - Agent not registered or not connected; check agent logs; verify `NC_CONNECTORS` includes `addomain`.
- Cloud log `cidr_blocked`:
  - Client source IP not in `allow_cidrs` (`ServiceConfigs/NowConnect/config/cloud.yaml`). Update allowlist if needed.
- Metrics fetch “connection refused”:
  - Query from inside the `nowconnect-cloud` container on `http://localhost:8765/metrics`.
  - If you need host access, expose 8765 externally or route via Traefik.
- LDAP errors “attribute type not present” on group membership deletion:
  - This is benign on idempotent cleanup. Tests were updated to ignore this when the member is already absent. For production, we recommend the connector treats LDAP result code 16 (noSuchAttribute) as success on delete.

## Reliability and observability recommendations

### Dashboards

Track at minimum:

- `nowconnect_tcp_connections_total{connector}`
- `rate(nowconnect_tcp_bytes_total[1m]) by (direction,connector)`
- `nowconnect_tcp_active_connections` (if added later)
- FIN/RST counters (FIN_SENT/FIN_RECV/RST_RECV) for anomalies

### Alerts (examples)

- “No traffic” burn alert:
  - No increase in `nowconnect_tcp_connections_total{connector="addomain"}` for 15m during business hours.
- “One-way traffic”:
  - `rate(nowconnect_tcp_bytes_total{direction="c2a"}[5m]) > 0` and `rate(...{direction="a2c"}[5m]) == 0` (or vice versa) for 5m.
- “Agent disconnected”:
  - Cloud log scrape detects loss of `agent_connected` without reconnect, or long gap in connections while service is up.

## CI/CD health gate (optional but encouraged)

Add a job that:

1) Spins up `nowconnect-cloud`, `nowconnect-premise`, `openldap`.
2) Executes the read‑only LDAP test with host `nowconnect-cloud`.
3) Pulls and asserts metrics deltas > 0 on c2a/a2c bytes counters.

## Notes and improvements

- System definition for tunnel route
  - Added `ServiceConfigs/CRUDService/config/systems/av_openldap_nowconnect.yaml` with `base_url: nowconnect-cloud`.
  - For runs that load a system by name, you can shadow `av_openldap` with this file via `SERVICE_CONFIG_DIR=/tmp/nowconnect` (copy/rename) so existing code paths use the tunnel without code edits.

- Idempotency fix in tests
  - `tests/integration/test_openldap_write_path.py` now ignores “attribute type not present” on member removal (safe retry behavior).
  - Recommended connector hardening: treat LDAP result code 16 (noSuchAttribute) as success on delete; result code 20 (typeOrValueExists) as success on add.

- Externalizing metrics (optional)
  - Today we read metrics from inside the `nowconnect-cloud` container.
  - To query from host, map port 8765 or route with Traefik and restrict access (IP allowlist).

## One-command “ping-pong and metrics” bundle (copy/paste)

```powershell
# 1) Start services
docker compose -f CRUDService/docker-compose-nowconnect.yml up -d nowconnect-cloud nowconnect-premise openldap

# 2) Generate tunnel traffic
docker compose -f CRUDService/docker-compose-nowconnect.yml run --rm `
  -e OPENLDAP_URL=ldap://nowconnect-cloud -e OPENLDAP_PORT=389 `
  -e OPENLDAP_BASE_DN=dc=example,dc=org -e OPENLDAP_USERNAME=cn=admin,dc=example,dc=org `
  -e OPENLDAP_PASSWORD=admin -e OPENLDAP_SSL=false `
  crud-service pytest tests/integration/test_openldap_readonly_extended.py::test_anonymous_bind_search -q

# 3) Show counters
docker compose -f CRUDService/docker-compose-nowconnect.yml exec nowconnect-cloud sh -lc `
"python - <<'PY'
import urllib.request
d = urllib.request.urlopen('http://localhost:8765/metrics', timeout=3).read().decode()
for l in d.splitlines():
    if l.startswith('nowconnect_tcp_connections_total') or l.startswith('nowconnect_tcp_bytes_total'):
        print(l)
PY"
```

This gives you a reliable, self‑service “ping‑pong” and metrics‑based validation for NowConnect at any time.

See also:

- `services/nowconnect/explanation/metrics-and-reliability`
- `services/crud-service/explanation/ldap-connector-idempotency`


