---
title: Enable PAR/DPoP and Client Auth Methods
---

Environment flags (verified in code)

- `MS_BFF_PAR_ENABLED`: enable Pushed Authorization Requests in the auth flow (`ms_bff_spike/ms_bff/src/routes/auth_stub.py`).
- `MS_BFF_DPOP_ENABLED`: toggle DPoP proof/validation (`auth_stub.py`; server‑side validation middleware in `src/main.py`).
- `MS_BFF_TOKEN_AUTH_METHOD`: `client_secret_basic` or `private_key_jwt` for token endpoint auth (`src/services/idp_client.py`).

mTLS (enterprise OAuth)

- The enterprise OAuth client supports mTLS; when enabled with cert/key, the IdP client passes the certificate to httpx and marks token binding as `mtls`.

Validation

- Check metrics for `par_requests_total` and DPoP validation counters; confirm token exchange works with the chosen auth method.


