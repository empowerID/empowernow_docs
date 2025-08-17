## NowConnect Premise Agent

Lightweight on‑prem agent that maintains an outbound WebSocket to the NowConnect Cloud Gateway and proxies traffic to local services identified as connectors.

### Configuration (environment)

- **NC_AGENT_URL (required)**: `wss://<gateway>/tunnel`
- **NC_AGENT_ID (required)**: unique agent identifier
- **NC_TOKEN_FILE (recommended)**: path to bearer token file (JWT); read at connect
- **NC_CONNECTORS (required)**: comma list of connector names, e.g. `ldap,db`
- For each connector name:
  - `NC_TARGET_<name>_HOST`
  - `NC_TARGET_<name>_PORT`
- **NC_LOG_LEVEL (optional)**: `DEBUG|INFO|WARNING|ERROR` (default `INFO`)
- **NC_LOG_FORMAT (optional)**: `plain|json` (default `plain`)
- **NC_TRUST_ENV (optional)**: `true` to allow system proxy settings via aiohttp (default `false`)
- **NC_HEALTH_HOST/NC_HEALTH_PORT (optional)**: TCP health server bind (default `0.0.0.0:8090`)

### Run with Docker

Build:

```bash
docker build -t nowconnect-premise:0.1.0 .
```

Agent Dockerfile:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src

RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["python", "-m", "nowconnect_agent"]
```

Run (Linux host networking example):

```bash
docker run -d --name nowconnect-agent --restart=always \
  --network host \
  -v $(pwd)/secrets/agent.token:/secrets/token:ro \
  -e NC_AGENT_URL=wss://gateway.example.com/tunnel \
  -e NC_AGENT_ID=agent-foo-01 \
  -e NC_TOKEN_FILE=/secrets/token \
  -e NC_CONNECTORS=ldap \
  -e NC_TARGET_ldap_HOST=127.0.0.1 \
  -e NC_TARGET_ldap_PORT=389 \
  nowconnect-premise:0.1.0
```

Note for Windows/macOS: without `--network host`, use `host.docker.internal` or the LAN IP for targets.

### Docker Compose

See `docker-compose.yml` and `nowconnect.env.example`.

```bash
docker compose up -d
```

Example compose:

```yaml
version: "3.8"
services:
  nowconnect-agent:
    build: .
    image: nowconnect-premise:0.1.0
    restart: always
    network_mode: host
    env_file:
      - nowconnect.env
    volumes:
      - ./secrets/agent.token:/secrets/token:ro
```

Example env file:

```bash
# Core connection
NC_AGENT_URL=wss://gateway.example.com/tunnel
NC_AGENT_ID=agent-foo-01

# Token file path inside container or on host depending on deployment
NC_TOKEN_FILE=/secrets/token

# Logging and proxy behavior
NC_LOG_LEVEL=INFO
NC_TRUST_ENV=false
NC_LOG_FORMAT=plain

# Health server
NC_HEALTH_HOST=0.0.0.0
NC_HEALTH_PORT=8090

# Connectors definition
NC_CONNECTORS=ldap
NC_TARGET_ldap_HOST=127.0.0.1
NC_TARGET_ldap_PORT=389
```

### systemd (Linux)

Install Python 3.11 and create `/etc/nowconnect/agent.env`:

```bash
NC_AGENT_URL=wss://gateway.example.com/tunnel
NC_AGENT_ID=agent-foo-01
NC_TOKEN_FILE=/etc/nowconnect/agent.token
NC_CONNECTORS=ldap
NC_TARGET_ldap_HOST=127.0.0.1
NC_TARGET_ldap_PORT=389
```

Unit file `/etc/systemd/system/nowconnect-agent.service`:

```ini
[Unit]
Description=NowConnect Premise Agent
After=network-online.target

[Service]
EnvironmentFile=/etc/nowconnect/agent.env
ExecStart=/usr/bin/python3 -m nowconnect_agent
Restart=always
RestartSec=2
WorkingDirectory=/var/lib/nowconnect
User=nowconnect
Group=nowconnect

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nowconnect-agent
```

### Windows service (NSSM)

Assuming Python at `C:\\Python311` and work dir `C:\\nowconnect`:

```bat
nssm install NowConnectAgent "C:\\Python311\\python.exe" "-m nowconnect_agent"
nssm set NowConnectAgent AppDirectory "C:\\nowconnect"
nssm set NowConnectAgent AppEnvironmentExtra "NC_AGENT_URL=wss://gateway.example.com/tunnel" "NC_AGENT_ID=agent-foo-01" "NC_TOKEN_FILE=C:\\nowconnect\\agent.token" "NC_CONNECTORS=ldap" "NC_TARGET_ldap_HOST=127.0.0.1" "NC_TARGET_ldap_PORT=389"
nssm set NowConnectAgent Start SERVICE_AUTO_START
```

### Kubernetes

A minimal Deployment is provided in `k8s/deployment.yaml`. For node‑local access, consider a DaemonSet and appropriate networking.

### Observability

- Logs: stdout/stderr; control with `NC_LOG_LEVEL` and `NC_LOG_FORMAT` (`json` recommended for k8s)
- Proxy: set `NC_TRUST_ENV=true` and configure OS env (`HTTP_PROXY`, `HTTPS_PROXY`, etc.)
- Health: TCP server on `NC_HEALTH_HOST:NC_HEALTH_PORT` (defaults to `0.0.0.0:8090`). k8s probes use `tcpSocket`.
- Restart behavior: the process reconnects on failure; supervise with container restart policies or service managers

### Security

- Always use `wss://` for `NC_AGENT_URL`
- Mount token file read‑only; rotate by replacing file and restarting

