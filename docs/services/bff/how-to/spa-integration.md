---
title: SPA Integration (React)
---

Integration pattern verified in code.

- Use same-origin `/api/**` calls; set constant `API_BASE='/api'` in frontend
- Unauthenticated flows return 401 JSON; SPA should redirect to `/auth/login`
- Session check endpoint: `GET /api/auth/session` → `{ authenticated: boolean, ... }`
- CSRF: `_csrf_token` cookie set on safe GET; send `X-CSRF-Token` for state-changing calls
- CORS allowlist read from `CORS__ALLOW_ORIGINS` / `CORS_ALLOW_ORIGINS`

```mermaid
sequenceDiagram
  autonumber
  participant SPA
  participant BFF
  SPA->>BFF: GET /api/auth/session
  alt authenticated
    BFF-->>SPA: 200 {authenticated:true}
    SPA->>BFF: GET /api/resource
    BFF-->>SPA: 200 JSON
  else unauthenticated
    BFF-->>SPA: 401 {authenticated:false}
    SPA->>BFF: GET /auth/login
  end
```
