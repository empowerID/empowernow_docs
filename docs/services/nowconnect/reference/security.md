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

### Northbound HTTP endpoints
- Keep TLS for all admin endpoints (e.g., `/metrics`, `/readyz`, `/healthz`). If any are exposed beyond the cluster or trusted network, optionally enforce client mTLS at ingress for those routes.

