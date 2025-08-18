---
id: ha-v2-architecture
title: NowConnect V2 High Availability (HA) – Architecture and operations
description: "V2 HA design for NowConnect Cloud/Premise: modes, config, wiring, control/data planes, health/readiness, metrics, failure modes, and test/runbook guidance."
sidebar_label: HA V2 architecture & ops
---

## NowConnect High Availability

- Security controls: Inbound mesh mTLS at ingress, outbound mesh mTLS support, JWT on agent tunnels, cert rotation runbook, masked logs, and platform secret storage guidance.
- Resilience: multi‑replica hubs with epoch‑fenced ownership, bounded queues, backpressure, and degrade behavior when Redis or mesh is impaired.
- Observability: readiness reflects HA state; mesh link and epoch safety metrics; golden dashboards and alerts provided below.
- Operability: feature‑flagged rollout (off → shadow → active), safe rollback, capacity tuning guidance, and perf validation runners.

### Trust boundaries and controls

```mermaid
graph LR
  subgraph Edge Internet and Ingress
    LB[Ingress or VIP]
  end
  subgraph Cloud Hubs
    H1(Cloud Hub A)
    H2(Cloud Hub B)
  end
  subgraph Control Plane
    R[(Redis)]
  end
  subgraph Premise Network
    P1(Premise Agent)
  end

  LB -->|LDAP TCP| H1
  LB -->|LDAP TCP| H2
  H1 <-->|mTLS WS mesh| H2
  H1 <--> R
  H2 <--> R
  P1 <-->|JWT WS tunnel| H1
  P1 <-->|JWT WS tunnel| H2
```

Controls at a glance

- Mesh (inbound): mTLS is enforced at ingress/proxy. When `require_mtls=true`, the app expects TLS‑terminated traffic and can validate protocol headers in dev.
- Mesh (outbound): the dialer supports mTLS via configured CA/cert/key; permessage‑deflate disabled; bounded send queues and inflight caps.
- Tunnel: JWT `aud=nowconnect`, connector scopes optional; short token TTL; TLS at ingress.
- Secrets: store certs/keys via secure mounts or your platform secret manager; app does not integrate Vault directly.
- Logs: PII masked; security events emitted; retention follows platform policy.

## Overview

- Goals: multi‑replica Cloud hubs that can forward flows across replicas, with ownership fencing, backpressure bounds, and observability.
- Modes (configurable):
  - `off` (default): single‑replica behavior; HA code paths not active
  - `shadow`: HA plumbing enabled but traffic continues using local ownership (observe mesh/registry)
  - `active`: cross‑replica delivery via mesh

### High‑level architecture

```mermaid
graph LR
  subgraph Clients
    C1["LDAP Client(s)"]
  end

  subgraph Cloud["NowConnect Cloud Hubs"]
    H1(Hub A)
    H2(Hub B)
  end

  subgraph Redis["Control Plane"]
    R[(Redis)]
  end

  subgraph Premise["NowConnect Premise Agents"]
    P1(Agent 1)
    P2(Agent 2)
  end

  C1 -->|LDAP| H1
  C1 -->|LDAP| H2
  H1 <-->|Mesh WS| H2
  H1 <--> R
  H2 <--> R
  H1 <--> P1
  H2 <--> P2
```

## Configuration

File: `ServiceConfigs/NowConnect/config/cloud.yaml` (set `NC_CONFIG=/app/config/cloud.yaml`).

Minimal (single listener + HA shadow):

```yaml
listeners:
  - { name: l1, bind: '0.0.0.0:389', connector: 'ldap' }
ha:
  enabled: true
  mode: shadow  # off|shadow|active
  replica_id: hub-a
  redis_url: redis://shared_redis:6379/0
  mesh:
    listen: 0.0.0.0:400        # optional server-side WS endpoint (ingress forwards to /mesh)
    peers: ["wss://cloud-b.ocg.labs.empowernow.ai/mesh"]
    require_mtls: true
    tls:
      ca_bundle: /app/certs/ca.pem
      cert_file: /app/certs/hub-a.crt
      key_file: /app/certs/hub-a.key
    send_queue_depth: 1000
    per_link_max_inflight_bytes: 8388608
    connect_backoff_max_sec: 30
```

Parsing: `nowconnect_cloud/config_loader.py` → `HAConfig`, `HAMeshConfig`, `HAMeshTLS`.

### Readiness decision flow

```mermaid
flowchart TD
  A[App start] --> B{ha.enabled?}
  B -- no --> R1[ready]
  B -- yes --> C{mode==active?}
  C -- no --> R1
  C -- yes --> D{mesh healthy AND registry healthy?}
  D -- yes --> R1
  D -- no --> R2[degraded]
```

## Cloud wiring

File: `nowconnect_cloud/app.py`

- Loads config (`load_cloud_config`); instantiates `RouterRegistry`
- If `ha.enabled`, creates `DistributedRegistry` (`redis_url` if present; in‑memory fallback)
- Creates `Hub` with `replica_id` and `ha_mode`
- If `ha.enabled`, creates `MeshManager` with peers/TLS/backpressure settings; attaches to Hub and app state
- Starts optional `RegistrySweeper` when Redis is used
- Exposes `/mesh` (WS) and `/tunnel` (agent WS), plus `/readyz` and `/healthz`

Readiness (`/readyz`):

- If `ha.enabled && mode==active`: returns `{ "status": "degraded" }` if mesh missing or distributed registry unhealthy; else `ready`. Otherwise returns `ready`.

```mermaid
sequenceDiagram
  participant App as FastAPI app
  participant Cfg as load_cloud_config
  participant Hub as Hub
  participant Dist as DistributedRegistry
  participant Mesh as MeshManager

  App->>Cfg: load cloud.yaml
  App->>Hub: new Hub(registry, replica_id, ha_mode)
  alt HA enabled
    App->>Dist: new DistributedRegistry(redis_url?)
    App->>Mesh: new MeshManager(hub, dist, peers...)
    App-->>Hub: attach mesh reference
  end
  App-->>App: expose /mesh, /tunnel, /readyz
```

## Control plane – DistributedRegistry

File: `nowconnect_cloud/distributed_registry.py`

- Redis‑backed registry (ownership and connector presence), in‑memory fallback when `redis_url` absent.
- Owned by Cloud; Premise ownership is claimed during agent `HELLO` (epoch‑based fencing).
- Registry Sweeper (`registry_sweeper.py`) periodically prunes stale entries.

Key functions (intent): `claim_ownership(agent_id, replica_id) -> epoch`, `add_connectors(agent_id, connectors)`, `list_agents(connector)`, `get_owner(agent_id) -> (owner_replica_id, epoch)`, `is_healthy()`.

### Ownership and epoch fencing

```mermaid
sequenceDiagram
  participant Agent
  participant Hub as "Cloud Hub"
  participant Reg as "DistributedRegistry"

  Agent->>Hub: HELLO(agent_id, connectors)
  Hub->>Reg: claim_ownership(agent_id, replica_id)
  Reg-->>Hub: epoch=n
  Hub->>Reg: add_connectors(agent_id, connectors)
  Hub-->>Agent: WELCOME(epoch=n)
  Hub-->>Agent: Frames validated against epoch and stale frames dropped
```

## Data plane – Mesh WS between hubs

File: `nowconnect_cloud/mesh.py`

- One persistent WS link per peer (outbound dialer); accept inbound links via `/mesh` handler
- Backpressure: per‑link writer queue (`send_queue_depth`), per‑link inflight bytes cap (`per_link_max_inflight_bytes`)
- Circuit breaker/backoff on failures (`connect_backoff_max_sec`)
- Dedup: per‑CID LRU `last_seq` with cap; epoch fencing validates `epoch` to reject stale frames

Frames: `M_OPEN/M_OPEN_ACK`, `M_DATA`, `M_FIN`, `M_RST` carrying `{cid, connector, agent_id, seq, epoch}`

Cross‑replica flow (origin=Hub B, owner=Hub A):

```mermaid
sequenceDiagram
  participant Client
  participant HubB as Cloud Hub B (origin)
  participant HubA as Cloud Hub A (owner)
  participant Agent as Premise Agent (owned by A)

  Client->>HubB: LDAP connect/search
  HubB->>HubA: M_OPEN(cid,connector,agent_id,epoch?)
  HubA-->>HubB: M_OPEN_ACK(ok=true)
  HubA->>Agent: OPEN(cid, connector)
  loop data
    HubB->>HubA: M_DATA(cid, seq, b64, epoch)
    HubA->>Agent: DATA(cid, seq, b64)
    Agent-->>HubA: DATA(cid, seq, b64)
    HubA-->>HubB: M_DATA(cid, seq, b64, epoch)
    HubB-->>Client: data
  end
  HubB->>HubA: M_FIN/M_RST
  HubA->>Agent: FIN/RST
```

### Mesh link state machine

```mermaid
stateDiagram-v2
  [*] --> Connecting
  Connecting --> Established: TLS OK
  Connecting --> Backoff: error
  Backoff --> Connecting: retry after backoff
  Established --> Backoff: link error
  Established --> Closed: shutdown
  Backoff --> Closed: disabled
```

## Listener selection and forwarding

File: `nowconnect_cloud/listeners.py`

- If HA off or registry absent → local router
- If HA shadow/active and distributed registry present: prefer a locally owned agent; otherwise use mesh and register an origin sink for return frames

## Endpoints and security

- `/mesh` (WS): For hub↔hub; enforce mTLS when `ha.mesh.require_mtls=true` (TLS often terminated at ingress)
- `/tunnel` (WS): For Premise agents; JWT with `aud=nowconnect`
- `/healthz`: Always `ok`
- `/readyz`: HA‑aware readiness (see above)

## Metrics (Prometheus)

From `mesh.py` and design:

- `nowconnect_mesh_links{peer,state}` (MESH_LINKS)
- `nowconnect_mesh_frames_total{dir,type}` (MESH_FRAMES_TOTAL)
- `nowconnect_mesh_rtt_seconds_*` histogram (MESH_RTT_SECONDS)
- `nowconnect_owner_epoch_mismatch_total` (OWNER_EPOCH_MISMATCH_TOTAL)
- `nowconnect_cid_dedup_dropped_total` (CID_DEDUP_DROPPED_TOTAL)
- `nowconnect_mesh_backpressure_drops_total{peer,reason}` (MESH_BACKPRESSURE_DROPS_TOTAL)
- `nowconnect_mesh_link_reconnects_total` (MESH_LINK_RECONNECTS_TOTAL)
- `nowconnect_mesh_link_errors_total` (MESH_LINK_ERRORS_TOTAL)
- Gauges in writer loop: per‑link queue size and inflight bytes

Alert ideas: Mesh P95 RTT > 20ms (5m); any queue overflow/backpressure drop > 0 (5m); epoch mismatches > 0 (5m); mesh link down > 60s. For cross‑replica share, base alerts on ingress/proxy connection metrics as the denominator.

## Failure modes (degrade behavior)

- Redis down: serve local‑only; reject cross‑replica; `/readyz` reports degraded
- Mesh down: only cross‑replica flows fail; local ownership unaffected
- Owner crash: existing flows drop; agent reconnects; new flows can be owned by surviving hub

## Test matrix and QA guidance

- Single‑replica regression (HA disabled) – ensure no side effects
- HA happy path (2 hubs + 1 agent): M_OPEN/ACK, bidirectional DATA, FIN/RST
- Owner crash; mesh partition; epoch fence; dedup; degrade scenarios as described
- Perf: use `CRUDService/tools/perf_nowconnect_ldap.py`; assert p99 and error budget

## DevOps notes (enablement & rollout)

Enable HA (shadow → active):

1. Deploy Redis; set `ha.enabled=true`, `mode=shadow`, `replica_id` per hub; configure `mesh.peers` and mTLS
2. Validate `/readyz` and mesh link metrics
3. Switch to `mode=active` per hub
4. Add LB/VIP for client traffic; scale hubs

Certificates: configure `ha.mesh.tls` with CA and per‑hub cert/key; enforce `require_mtls=true` in production.

Scaling: add replicas and peers; ensure queue and inflight caps fit workload.

Runbooks: link down (check metrics/TLS); Redis degraded (local‑only mode, `/readyz` degraded).

## SLOs, capacity, and dashboards

SLOs (starting points)

- Availability: 99.9% per month for Cloud hubs
- Mesh RTT p95: ≤ 20 ms
- Cross‑replica share: ≤ 40% sustained (investigate if higher)

Capacity tuning

- Per‑link send_queue_depth: 500–2000 depending on RTT and throughput
- per_link_max_inflight_bytes: 4–16 MiB
- Redis: size for agent count and connector updates (use eviction disabled; monitor memory)

Golden dashboards (Grafana)

- Mesh health: links by state; RTT p50/p95; frames and bytes by dir
- Safety: owner epoch mismatches; dedup drops; backpressure counters
- Throughput: TCP connections and bytes (from existing metrics)

Alerts (Prometheus rules examples)

```yaml
- alert: NowConnectMeshHighRTT
  expr: histogram_quantile(0.95, rate(nowconnect_mesh_rtt_seconds_bucket[5m])) > 0.02
  for: 5m
  labels: { severity: warning }
  annotations: { summary: "Mesh RTT p95 high" }

# Cross‑replica share requires a denominator from ingress/proxy metrics; example intentionally omitted
```

## Certificate rotation and secrets

- Store mesh CA/cert/key via secure mounts or your platform secret manager; restrict read permissions
- Rotate certificates per policy; restart the hub processes or containers to pick up new files (hot reload is not supported)
- JWT for agent tunnels issued by your IdP or configured signing service; rotate per your security policy; short token TTL recommended

## Validation and evidence

- Runner: `CRUDService/tools/perf_nowconnect_ldap.py`
- Guide: `CRUDService/tools/perf_nowconnect_ldap_guide.md`
- Sample report: `CRUDService/tools/perf_nowconnect_report.md`

## Code pointers

- Config parsing: `nowconnect_cloud/config_loader.py`
- App wiring/endpoints: `nowconnect_cloud/app.py`
- Mesh manager: `nowconnect_cloud/mesh.py`
- Listener selection: `nowconnect_cloud/listeners.py`
- Distributed registry: `nowconnect_cloud/distributed_registry.py`
- Registry sweeper: `nowconnect_cloud/registry_sweeper.py`
- Hub (frame routing): `nowconnect_cloud/hub.py`

## Known gaps & future work

- Shadow mode coverage/metrics; peer discovery; multi‑tenant selection; extended soak/chaos in CI/CD


