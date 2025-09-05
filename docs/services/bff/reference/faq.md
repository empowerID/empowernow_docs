---
title: BFF FAQ (for SPA Developers)
---

Q: Where does the user identity come from?
A: From the OIDC ID token (or UserInfo). The BFF stores `user_id = id_token.sub` in the session.

Q: Are backend service tokens the user identity?
A: No. They’re held server-side by the BFF (often `sub = client_id` like `bff-server`) and must never be exposed to the browser.

Q: Do I need to attach Authorization headers?
A: No. The BFF uses httpOnly cookies. Use `apiClient`/`fetchWithAuth`; it sends credentials automatically.

Q: Where do I point my SPA?
A: Set `VITE_BFF_BASE_URL` to your BFF origin (or `/api` when same origin). The app wraps with `AuthProvider`.

Q: Dev vs Prod base URL?
A: Dev (separate origins): set `VITE_BFF_BASE_URL` to the BFF origin (e.g., `http://localhost:8000/api`) and allow your UI origin in CORS. Prod (same origin): set it to `/api`.

Q: Where are the API routes defined?
A: `ServiceConfigs/BFF/config/routes.yaml`. Example: `/api/crud/forms/*` → `crud_service` with `auth: session`.

Q: Why do SPA calls look like local `/api/...` paths? How do they reach backends?
A: Traefik routes `PathPrefix(/api/*)` to the BFF. The BFF reads `routes.yaml` where `path` is the client path and `upstream_path` points to the backend. It proxies the call to the target service (adding auth/context headers) and returns JSON to the SPA.

Q: Why 401 vs 403?
A: 401 = not authenticated (login). 403 = authenticated but PDP denied the action.

Q: How are permissions decided?
A: `core/permissions.py` builds context; the route’s inline `authz_map` (preferred) maps method→resource/action; legacy `pdp.yaml:endpoint_map` is used if no inline mapping is present; `services/pdp_client.py` calls PDP and caches decisions.

Q: Which SPAs call the PDP from the UI?
A: See `Reference / SPA PDP usage` for a current inventory (Visual Designer: yes; IdP UI: no; PDP UI: yes for tools/visualization).

Q: Can I call services directly?
A: In production, no. All calls go via the BFF to prevent token exposure and centralize authorization.

Q: How should I register the BFF client with the IdP?
A: Use the DCR bootstrap runbook. For inline JWKS rotation (no IdP refetch), enable the bootstrapper with `DCR_ENABLED=true`, set `DCR_SIGNING_KEY` and `BFF_KID`, and provide a one-time `DCR_IAT` for first registration. For safe rotations, set `DCR_ROTATION_SAFE=true` and choose a `DCR_REDIRECT_UPDATE_MODE`.

Q: How do access tokens get renewed?
A: The BFF auto-refreshes access tokens in the background and on demand before expiry. No SPA changes are required.

Q: How do we rotate credentials safely?
A: With inline JWKS mode, the bootstrapper performs non-destructive rotations: it adds a new key (up to `BFF_JWK_MAX_KEYS`), retires old keys after `BFF_JWK_RETIRE_AFTER_DAYS`, and only persists PEM after a successful PATCH. Redirect URIs are merged when `DCR_ROTATION_SAFE=true` to avoid churn.

Q: Can I rotate or set `client_secret` via public DCR PATCH?
A: Not supported in our IdP’s public DCR endpoint. Use an admin/out-of-band path if absolutely required; otherwise stick to `private_key_jwt` + `jwks_uri`.

Q: How do I add a new API?
A: Add a service in `routes.yaml:services`, then a `routes` entry for your canonical `/api/<app>/*` path with `auth: session` and an `upstream_path`.

Q: How do I style to match EmpowerNow?
A: Import `@empowernow/ui/dist/index.css` and use components from `@empowernow/ui`.


