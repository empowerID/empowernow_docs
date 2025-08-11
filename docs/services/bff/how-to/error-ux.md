---
title: Error Handling UX — 401 vs 403
---

Patterns (verified)

- 401 unauthenticated: BFF returns JSON with CORS headers in SPA mode; guard redirects to `/login` with `returnUrl` preserved.
- 403 forbidden: PDP denied; render an Access Denied view with optional retry/request‑access flow.

Frontend wrapper

- `fetchWithAuth` throws `ApiError(status, message)` for fallback paths; handle with toasts and route‑level UI where appropriate.

Checklist

- Ensure unauthenticated JSON responses include CORS headers; avoid opaque failures.
- Map status codes to clear UX in SPAs.


