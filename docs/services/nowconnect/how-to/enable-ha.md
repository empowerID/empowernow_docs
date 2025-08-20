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

### Ingress mTLS for `/mesh`

When `ha.mesh.require_mtls: true`, enforce client mTLS at the edge for the `/mesh` route so only verified hubs can connect. The app expects TLS-terminated traffic at ingress.

Traefik (Docker, using a dynamic TLS options file):

```yaml
# nowconnect-cloud service labels (add alongside existing /tunnel labels)
labels:
  - "traefik.http.routers.nowconnect-mesh.rule=Host(`cloud-a.example.com`) && Path(`/mesh`)"
  - "traefik.http.routers.nowconnect-mesh.entrypoints=websecure"
  - "traefik.http.routers.nowconnect-mesh.tls=true"
  - "traefik.http.routers.nowconnect-mesh.tls.options=mtls@file"
  - "traefik.http.services.nowconnect-mesh.loadbalancer.server.port=8765"
```

Traefik dynamic options (mounted into the Traefik container):

```yaml
# traefik_dynamic.yml
tls:
  options:
    mtls:
      clientAuth:
        clientAuthType: RequireAndVerifyClientCert
        caFiles:
          - /etc/traefik/mesh/mesh_ca.pem
```

Nginx (reverse proxy in front of the Cloud Hub):

```nginx
server {
    listen 443 ssl;
    server_name cloud-a.example.com;

    ssl_certificate     /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;

    # Require and verify client certs for /mesh only
    location = /mesh {
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;

        ssl_verify_client on;
        ssl_client_certificate /etc/nginx/mesh/mesh_ca.pem;

        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_pass http://nowconnect-cloud:8765/mesh;
    }
}
```

Notes:
- The peer hub’s client certificate must chain to `mesh_ca.pem` and include a SAN matching the peer hostname in `ha.mesh.peers`.
- Keep `/tunnel` as TLS (no client cert). Authentication is via JWT on WebSocket upgrade.

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


