---
title: Dev vs Prod Setup for SPAs
---

Dev (separate origins)

- Set `VITE_BFF_BASE_URL` to the BFF origin (e.g., `http://localhost:8000/api` or `https://api.ocg.labs.empowernow.ai`).
- Ensure CORS allows your dev origin in BFF settings (present in backend config; verify per environment).
- Configure hosts entries for local TLS domains if using Traefik per the QA guide.

Prod (same origin)

- Serve the SPA via Traefik with the BFF; set `VITE_BFF_BASE_URL` to `/api` (default in current SPAs).
- Cookies are scoped for SSO across apps/domains as configured by the BFF; no Authorization header required.

Cookie domain/path

- Session cookies are set by the BFF during auth callback; domain and path depend on deployment. For multi‑SPA SSO under related subdomains, align cookie domain at the parent if required by your ingress.


