---
title: BFF FAQ (for SPA Developers)
---

Q: Do I need to attach Authorization headers?
A: No. The BFF uses httpOnly cookies. Use `apiClient`/`fetchWithAuth`; it sends credentials automatically.

Q: Where do I point my SPA?
A: Set `VITE_BFF_BASE_URL` to your BFF origin (or `/api` when same origin). The app wraps with `AuthProvider`.

Q: Where are the API routes defined?
A: `ServiceConfigs/BFF/config/routes.yaml`. Example: `/api/crud/forms/*` → `crud_service` with `auth: session`.

Q: Why 401 vs 403?
A: 401 = not authenticated (login). 403 = authenticated but PDP denied the action.

Q: How are permissions decided?
A: `core/permissions.py` builds context; `services/path_mapper.py` maps path→resource/action using `pdp.yaml:endpoint_map`; `services/pdp_client.py` calls PDP and caches decisions.

Q: Can I call services directly?
A: In production, no. All calls go via the BFF to prevent token exposure and centralize authorization.

Q: How do I add a new API?
A: Add a service in `routes.yaml:services`, then a `routes` entry for your canonical `/api/<app>/*` path with `auth: session` and an `upstream_path`.

Q: How do I style to match EmpowerNow?
A: Import `@empowernow/ui/dist/index.css` and use components from `@empowernow/ui`.


