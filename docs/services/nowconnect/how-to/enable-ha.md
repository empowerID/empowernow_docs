---
id: enable-ha
title: Enable NowConnect HA (shadow → active)
description: "How to configure cloud.yaml for HA, validate readiness/metrics, and roll out active mesh across replicas."
sidebar_label: Enable HA
---

## Prerequisites

- Redis reachable by Cloud hubs
- mTLS certs/keys for mesh (`ha.mesh.tls`) and ingress route to expose `/mesh`

## Configure cloud.yaml

File: `ServiceConfigs/NowConnect/config/cloud.yaml`

```yaml
listeners:
  - { name: l1, bind: '0.0.0.0:389', connector: 'ldap' }
ha:
  enabled: true
  mode: shadow
  replica_id: <hub‑name>
  redis_url: redis://shared_redis:6379/0
  mesh:
    peers: ["wss://<peer‑hub>/mesh"]
    require_mtls: true
    tls:
      ca_bundle: /app/certs/ca.pem
      cert_file: /app/certs/<hub>.crt
      key_file: /app/certs/<hub>.key
    send_queue_depth: 1000
    per_link_max_inflight_bytes: 8388608
```

Set `NC_CONFIG=/app/config/cloud.yaml` for the container.

## Validate

- `/readyz` returns `ready` in shadow; `degraded` in active if mesh/registry unhealthy
- Metrics show mesh links and frames:
  - `nowconnect_mesh_links{peer,state}`
  - `nowconnect_mesh_frames_total{dir,type}`

## Activate

1) Flip `ha.mode` to `active` on each hub and reload
2) Add LB/VIP for client traffic to target both hubs
3) Monitor:
   - Mesh RTT: `nowconnect_mesh_rtt_ms`
   - Backpressure/overflows: `nowconnect_mesh_backpressure_total{reason}`
   - Epoch/dedup safety: `nowconnect_owner_epoch_mismatch_total`, `nowconnect_cid_dedup_dropped_total`

## Rollback

Set `ha.mode: off` (or `shadow`) to disable cross‑replica delivery; local flows continue.

See also: `services/nowconnect/explanation/ha-v2-architecture`.


