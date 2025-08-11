---
title: Frontend Errors and UX Patterns (401/403)
---

What we know (verified)

- `fetchWithAuth` delegates to `apiClient` from `@empowernow/bff-auth-react` and sends cookies.
- Wrapper strips leading `/api` and falls back to `fetch` for uncommon verbs.
- Errors from fallback expose `{ status, message }` via `ApiError`.

Recommended UI

- 401: redirect to `/login` preserving `returnUrl` (the guard already implements this).
- 403: show an “Access denied” view; optionally provide a refresh/retry button.
- Network/timeouts: show a toast via your app’s UI kit and retry guidance.

Notes

- Standard retry/backoff is app-specific; no shared policy exists in this repo.
- Ensure not to add Authorization headers; cookies suffice for same-origin.


