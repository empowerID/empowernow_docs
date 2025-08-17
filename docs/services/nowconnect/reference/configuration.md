## Configuration Reference

### Cloud (`config/cloud.yaml`)

```yaml
listeners:
  - name: addomain-ldap
    bind: "0.0.0.0:389"
    connector: "addomain"
  - name: devdomain1-ldaps
    bind: "0.0.0.0:636"
    connector: "devdomain1"
  - name: sapldapvds
    bind: "0.0.0.0:400"
    connector: "sapldapvds"

tunnel:
  host: "0.0.0.0"
  port: 8765
  max_ws_payload: 8192
  ping_interval_sec: 20
  ping_timeout_sec: 20

limits:
  idle_timeout_ms: 60000
  queue_depth_per_cid: 100
  max_conn_total: 2000

security:
  jwks_url: "https://idp.ocg.labs.empowernow.ai/api/oidc/.well-known/jwks.json"
  audience: "nowconnect"
  allow_cidrs: []
  require_connector_scopes: false   # optional enforcement; can be toggled via env
  fapi_mode: 0                      # 0: off (default); 2: enable DPoP verification when implemented

observability:
  metrics_port: 8000
  log_level: "INFO"

pdp:
  url: ""                     # optional AuthZEN PDP endpoint; enable if set
  cache_ttl_sec: 5            # small cache for allow decisions
  timeout_ms: 500             # PDP request timeout
  fail_open: false            # if true, allow on PDP errors; default deny-fast
```

### Premise (`config/premise.yaml`)

```yaml
tunnel:
  url: "wss://api.ocg.labs.empowernow.ai/tunnel"
  agent_id: "premise-site-01"
  exported_connectors: ["addomain","devdomain1","sapldapvds"]
  auth:
    token_file: "/run/secrets/nowconnect-agent.jwt"
  ping_interval_sec: 20
  ping_timeout_sec: 20
  max_ws_payload: 8192

targets:
  addomain:   { host: "addomain.com",  port: 389 }
  devdomain1: { host: "devdomain1.com", port: 636 }
  sapldapvds: { host: "sapldapvds",     port: 400 }

limits:
  idle_timeout_ms: 60000
  connect_timeout_ms: 3000
  queue_depth_per_cid: 100
  max_inflight_cids: 2000

observability:
  metrics_port: 8000
  log_level: "INFO"

proxy:
  https_proxy: ""
  no_proxy: ""
  ca_bundle: ""

### Environment variables (Cloud)

- `NOWCONNECT_JWKS_URL`, `NOWCONNECT_AUDIENCE`
- `NOWCONNECT_REQUIRE_CONNECTOR_SCOPES` (default `false`)
- `NOWCONNECT_FAPI_MODE` (default `0`)
- `NOWCONNECT_PDP_URL`, `NOWCONNECT_PDP_CACHE_TTL_SEC`, `NOWCONNECT_PDP_TIMEOUT_MS`, `NOWCONNECT_PDP_FAIL_OPEN`

### Environment variables (Premise)

- `NC_CA_BUNDLE` path to a custom CA bundle file (overrides YAML `proxy.ca_bundle`)
- `NC_TRUST_ENV=true` to honor system proxy env (`HTTPS_PROXY`, `NO_PROXY`, ...)
- Env overrides take precedence over YAML
```

### Env vars (Premise Agent)

See `how-to/premise-agent` for the full list and examples.

