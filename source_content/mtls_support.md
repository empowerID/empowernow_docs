## mTLS support in BFF ↔ IdP ↔ PDP (current state and path to enable)

### TL;DR
- We do NOT use mTLS today on any of the BFF↔IdP or BFF↔PDP hops.
- The BFF authenticates to IdP with private_key_jwt (PKJWT), not mTLS.
- PDP calls are over plain HTTP inside the Docker network; no TLS/mTLS on that path.
- We can enable mTLS, but it requires infra and app changes. This doc lists what’s needed.

---

### What mTLS is (and is not)
- mTLS authenticates the client during the TLS handshake using a client X.509 certificate. The server verifies that certificate against a trusted CA and optionally against client‑specific metadata.
- private_key_jwt is NOT mTLS. It’s an OAuth client authentication method where the client signs a JWT (client_assertion) with a private key and sends it to the token endpoint over HTTPS.

---

### Current configuration snapshot

- IdP clients are configured for `private_key_jwt` or `client_secret_*`, not `tls_client_auth`:

```601:672:ServiceConfigs/IdP/config/clients.yaml
bff-server:
  client_id: bff-server
  ...
  token_endpoint_auth_method: private_key_jwt
  jwks:
    keys:
      - kid: bff-sig-001
        alg: RS256
        kty: RSA
        use: sig
```

- BFF PDP client also uses PKJWT today (via env):

```1931:1939:CRUDService/docker-compose-authzen4.yml
      PDP_BASE_URL: http://pdp:8001/access
      PDP_TOKEN_URL: http://idp-app:8002/api/oidc/token
      PDP_CLIENT_ID: bff-server
      PDP_CLIENT_SECRET: ""
      PDP_TOKEN_AUTH_METHOD: private_key_jwt
      PDP_CLIENT_ASSERTION_KID: bff-sig-001
      PDP_CLIENT_ASSERTION_KEY_PATH: /app/keys/bff-sig-001.pem
      PDP_TOKEN_SCOPE: application.all
```

- PDP is served over HTTP internally (no TLS/mTLS on that hop):

```528:555:CRUDService/docker-compose-authzen4.yml
  pdp:
    ...
    - ENABLE_SSL=false
    - HOST=0.0.0.0
    - PORT=8001
```

---

### Support matrix (today)
- BFF → IdP token endpoint (client_credentials / token exchange)
  - Transport: HTTP (internal Docker) or HTTPS (external), no client cert.
  - Client authentication: private_key_jwt (PKJWT). Works today.
  - mTLS: Not enabled.

- BFF → PDP evaluate APIs
  - Transport: HTTP (internal Docker). No TLS.
  - Request authentication to PDP: Bearer token, obtained from IdP via PKJWT.
  - mTLS: Not enabled.

- User browser → Traefik → BFF/IdP
  - External TLS is enabled via Traefik with public certs.
  - No client cert required from the browser (as expected).

---

### Gaps to support mTLS
1) IdP token endpoint (mTLS client authentication)
   - The IdP would need to accept `tls_client_auth` (or `self_signed_tls_client_auth`) per OIDC.
   - Operationally, we need TLS termination that requests client certs and surfaces certificate details to the IdP (e.g., Envoy/Nginx/Traefik mTLS passthrough + headers/conn info).
   - Application side needs to map the presented cert to an OIDC client (subject DN/SPKI/sha256 thumbprint) and validate per spec. Our IdP codebase currently doesn’t implement this mapping; only client_secret_* and PKJWT are in use.

2) BFF → IdP with mTLS
   - BFF container needs a client certificate + private key and a trusted CA bundle mounted.
   - HTTP client in BFF/SDK must be wired to present that cert on the token endpoint connection.
   - IdP’s token endpoint must require/verify client certs and map to the client.

3) BFF → PDP with mTLS
   - Run PDP with TLS enabled and configured to require client certs (server side trust store).
   - Mount BFF client cert/key and CA bundle; configure the SDK HTTP client to present them for all PDP calls.

---

### Proposed enablement plan

Phase 1 – IdP stays PKJWT; add optional mTLS for PDP hop only
1. Enable TLS on PDP (container flag/ingress). Provide server cert and trust chain.
2. Generate BFF client cert + key signed by a private CA; mount into BFF container.
3. Configure PDP to require/verify client certs; trust the issuing CA.
4. Add BFF config (example env surface):

```yaml
# BFF → PDP mTLS (proposed envs)
PDP_TLS_ENABLED: "true"
PDP_TLS_CLIENT_CERT: /app/certs/bff-client.crt
PDP_TLS_CLIENT_KEY:  /app/certs/bff-client.key
PDP_TLS_CA_CERT:     /app/certs/ca.pem
```

5. Update PDP_BASE_URL to https://pdp:8001/access and test connectivity.

Pros: Improves service‑to‑service identity on the most sensitive path without changing IdP auth.

Phase 2 – Optional: IdP token endpoint mTLS clients
1. Introduce an ingress (Envoy/Nginx/Traefik) in front of IdP’s token endpoint that requires client certs for `/api/oidc/token`.
2. Extend IdP to support `tls_client_auth`/`self_signed_tls_client_auth` client registrations and certificate→client binding checks.
3. Register a new confidential client for BFF with `token_endpoint_auth_method=tls_client_auth`.
4. Configure BFF to present client cert on token calls. Keep PKJWT as fallback until stabilized.

Pros: Strong client authentication bonded at transport; Cons: more complex ops, dynamic client rotation harder than PKJWT.

---

### Guidance: When to choose which
- Keep PKJWT for IdP token acquisition unless a regulatory/control requirement mandates mTLS. PKJWT scales easily, rotates keys with JWKS, and is widely supported by our tooling.
- Use mTLS for internal service‑to‑service calls where you want network‑bound identity in addition to Bearer tokens (e.g., BFF→PDP in prod).

---

### Action items (tracked)
- Implement optional TLS/mTLS knobs for PDP server and BFF client (SDK HTTP client settings).
- Add IdP client model and verification pipeline for `tls_client_auth` if/when required.
- Create secrets management entries (Vault/Docker secrets) for client certs/keys and CA bundles.

---

### Appendix: Related configurations
- Current BFF PDP auth (PKJWT): see `CRUDService/docker-compose-authzen4.yml` under the `bff` service.
- IdP client registrations: see `ServiceConfigs/IdP/config/clients.yaml`.


