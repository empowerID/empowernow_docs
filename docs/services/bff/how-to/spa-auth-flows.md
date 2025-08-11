---
title: SPA Auth Flows with the BFF
---

Verified behavior in current SPAs

- Auth provider: apps wrap `<App />` with `AuthProvider` from `@empowernow/bff-auth-react` and call `setBaseUrl(VITE_BFF_BASE_URL || '/api')`.
- Guarding: both SPAs use an `AuthGuard` that reads `{ isAuthenticated, isLoading }` from `useAuth()` and allows public routes `['/login', '/callback', '/auth-debug']`.
- Base URL: both SPAs default to `/api` when co-hosted with the BFF; otherwise set `VITE_BFF_BASE_URL`.

Login flow (observed)

- The guard redirects unauthenticated users to `/login?returnUrl=...`.
- Each frontend includes a `Login` page under `components/Login` that initiates auth via the BFF/IdP.
- The guard treats `/callback` as public; callback handling is present (e.g., `idp_ui/src/components/AuthCallback/index.tsx`).

Logout flow

- Use your app’s login page or top‑nav to surface a logout action. The `@empowernow/bff-auth-react` provider is expected to expose logout; the exact method name is not in this repo. If unavailable, implement a call to the BFF’s auth router logout endpoint (served by BFF, not via `routes.yaml`).

Sequence (high level)

```mermaid
sequenceDiagram
  autonumber
  participant UI as SPA
  participant BFF
  participant IdP
  UI->>UI: Navigate to /login
  UI->>BFF: Start login (redirect)
  BFF->>IdP: OAuth authorize
  IdP-->>BFF: Callback with code
  BFF-->>UI: Sets session cookie; redirect to returnUrl
  UI->>BFF: API calls using cookies
```

Public routes vs guards (verified)

- Public: `/login`, `/callback`, `/auth-debug`
- Guard everything else using `AuthGuard`.

Reading current auth state

- Use `const { isAuthenticated, isLoading } = useAuth()` from `@empowernow/bff-auth-react`.
- This repo does not include a user profile hook/shape; surface minimal UI based on `isAuthenticated` and call backend APIs for user-specific data as needed.


