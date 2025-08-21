## Security Model

- TLS for all tunnels (`wss://`). Traefik or in‑app TLS termination.
- JWT on WebSocket upgrade (`Authorization: Bearer <jwt>`):
  - Validate against IdP JWKS; enforce `aud=nowconnect`
  - Required claims: `agent_id`; reconcile with `HELLO.agent_id`
  - Optional: permitted `connectors`/scopes in claims
- Optional CIDR allowlists for inbound TCP listeners (cloud).
- No payload logging; redact sensitive metadata.
- Token rotation: mount token file read‑only; agent reconnects on rotation or ~1m before expiry.

### Optional hardening toggles (cloud)
- `NOWCONNECT_REQUIRE_CONNECTOR_SCOPES`: if true, enforce connector scopes from JWT claims
- `NOWCONNECT_FAPI_MODE`: 0 = off (default), 2 = enable DPoP verification when implemented
- PDP checks on `OPEN(connector)` can be enabled via `NOWCONNECT_PDP_URL` and related settings

### Cryptographic profile
- TLS: 1.2 and 1.3 supported; prefer 1.3 where platform ingress supports it.
- Ciphers: follow platform ingress defaults for modern secure ciphers (AES-GCM/CHACHA20). Disable legacy/NULL/EXPORT suites.
- JWT: RS256/PS256/ES256 recommended; validate `aud` and signature via JWKS; require `agent_id` claim.
- FIPS: Achieved via your base image/OS crypto modules; NowConnect uses system TLS libraries.

### Abuse and DoS controls
- Connection limits: bound total connections and per-connection queues (`queue_depth_per_cid`), idle timeouts, and max inflight bytes on mesh links.
- Backpressure: tune `send_queue_depth` and `per_link_max_inflight_bytes` by RTT/throughput; alert on backpressure drops.
- Rate limiting: enforce at ingress/load balancer; use CIDR allowlists for sensitive listeners.

### Northbound HTTP endpoints
- Keep TLS for all admin endpoints (e.g., `/metrics`, `/readyz`, `/healthz`). If any are exposed beyond the cluster or trusted network, optionally enforce client mTLS at ingress for those routes.

