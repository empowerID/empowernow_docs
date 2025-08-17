## Deploy the NowConnect Cloud Hub

The Cloud Hub is a FastAPI service exposing `/tunnel` (WebSocket), `/healthz`, `/readyz`, and `/metrics`. It binds TCP listeners that map to connector names.

### Configuration (cloud.yaml excerpt)

```yaml
tunnel:
  host: 0.0.0.0
  port: 8765

listeners:
  - name: ldap
    bind: 0.0.0.0:389
    connector: addomain

limits:
  queue_depth_per_cid: 100
  idle_timeout_ms: 60000

security:
  jwks_url: http://idp-app:8002/api/oidc/jwks
  audience: nowconnect
  allow_cidrs:
    - 0.0.0.0/0

observability:
  log_level: INFO
```

### Dockerfile (cloud)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src

RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1

EXPOSE 8765

CMD ["uvicorn", "nowconnect_cloud.app:app", "--host", "0.0.0.0", "--port", "8765"]
```

### Compose (cloud excerpt with Traefik routing to `/tunnel`)

```yaml
services:
  nowconnect-cloud:
    image: your-registry/nowconnect-cloud:latest
    environment:
      SERVICE_CONFIG_DIR: /app/config
      LOG_LEVEL: info
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      NC_CONFIG: /app/config/cloud.yaml
    volumes:
      - C:/source/repos/ServiceConfigs/NowConnect/config:/app/config
    ports:
      - "389:389"
      - "636:636"
      - "400:400"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nowconnect-ws.rule=Host(`api.ocg.labs.empowernow.ai`) && Path(`/tunnel`)"
      - "traefik.http.routers.nowconnect-ws.entrypoints=websecure"
      - "traefik.http.routers.nowconnect-ws.tls=true"
      - "traefik.http.services.nowconnect-ws.loadbalancer.server.port=8765"
```

### Notes

- Validate WS upgrade with JWT (audience `nowconnect`); reconcile `HELLO` claims.
- Enforce optional CIDR allowlists on TCP listeners.
- Export Prometheus metrics at `/metrics`; instrument dashboards and alerts.

