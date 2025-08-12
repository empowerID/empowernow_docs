---
title: Rotate IdP Client Secrets and JWKS
---

What this covers

- IdP client credentials used by the BFF (client_id/client_secret for token and introspection calls)
- BFF signing key and JWKS for private_key_jwt (if used)
- Other BFF secrets: `TOKEN_HASH_SALT`, `UA_HASH_SALT`, `CSRF_SECRET_KEY`, `STATE_TOKEN_KEY`

Where secrets live (compose default)

- Docker secrets under `/run/secrets` (see `CRUDService/docker-compose-authzen4.yml`) and env vars for non-secrets.
- BFF reads:
  - `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET` for IdP calls
  - `TOKEN_HASH_SALT` (required at startup) and `UA_HASH_SALT`
  - `CSRF_SECRET_KEY`, `STATE_TOKEN_KEY`
  - `BFF_JWT_SIGNING_KEY` or key material in `BFF_KEYS_DIR` for JWKS

Rotate IdP client secrets

1) Create a new secret material in your secrets store and update your compose/K8s secrets:
   - Docker secret `oidc-client-secret` or env `AUTH_CLIENT_SECRET`
2) Deploy the BFF with both old and new credentials valid at the IdP.
3) Verify bearer introspection and code‑flow token exchange still succeed.

Rotate BFF signing key (JWKS)

- Code paths: `ms_bff_spike/ms_bff/src/routes/jwks.py`, `ms_bff_spike/ms_bff/src/crypto/jwks_manager.py`, `ms_bff_spike/ms_bff/scripts/rotate_keys.py`.
- By default, the BFF ensures a key exists under `BFF_KEYS_DIR` and serves JWKS at `/.well-known/jwks.json`.
- Recommended: configure the IdP client to use `jwks_uri: https://<your-bff-host>/.well-known/jwks.json` so the IdP fetches keys automatically.

Manual rotation procedure

```bash
# In the BFF container or sidecar with the same volume mount
export BFF_KEYS_DIR=/app/keys
export AUTO_KEY_ROTATION=1
python -m ms_bff.scripts.rotate_keys

# In most setups no DCR call is required when using jwks_uri; the IdP will fetch new keys.
# If your IdP does not poll jwks_uri, consult IdP docs for a cache-bust endpoint.
```

Zero‑downtime tips

- Serve both old and new keys in JWKS during the grace window (jwks_manager preserves previous entries when you write the new JWKS).
- Keep old client credentials valid at IdP until all pods/instances are rolled.
- Stagger restarts; validate `/auth/login`, `/auth/callback`, and bearer calls.

FAQ

- Why not rotate `client_secret` automatically?
  - Shared secrets are weaker and harder to distribute/rotate safely. Prefer `private_key_jwt` with `jwks_uri` so rotation is done by updating JWKS.
- Can I update `client_secret` via DCR PATCH?
  - Not via the public endpoint in our IdP. Use an admin/out-of-band update if absolutely necessary.

Rotate salts and CSRF/state secrets

- `TOKEN_HASH_SALT`: restart required; BFF refuses startup if missing. Rotate during a maintenance window.
- `UA_HASH_SALT`: safe to rotate with restart; affects analytics hashing only.
- `CSRF_SECRET_KEY`: rotate with coordinated SPA downtime as existing CSRF tokens will be invalidated.
- `STATE_TOKEN_KEY`: rotate with caution; affects in‑flight login state.

Verification checklist

- After rotation, test:
  - SPA login/callback flow and subsequent `/api/**` calls (session)
  - Bearer flow to an `auth: bearer` route (introspection)
  - JWKS endpoint responds and IdP accepts private_key_jwt if enabled

References

- How‑to → Configure IdPs (idps.yaml)
- How‑to → Configure PDP (pdp.yaml)
- Reference → Observability (monitor auth errors during rotation)


