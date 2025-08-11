---
title: Rotate IdP Client Secrets and JWKS
---

IdP client credentials and signing keys must be rotated regularly.

IdP client credentials

- Store client ID/secret in your secret manager and mount/inject into the BFF.
- Rotate by adding the new secret, updating deployment, and verifying token exchange.

JWKS rotation (audience validation)

- BFF fetches JWKS from the IdP per `idps.yaml` (issuer/jwks_url). Rotate keys by publishing a new key set and phasing out old keys after caches expire.

Checklist

- Update secrets → rollout → verify `/auth/login` → validate API calls
- Monitor errors for signature failures during the window


