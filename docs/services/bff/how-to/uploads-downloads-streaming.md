---
title: Uploads, Downloads, and Streaming via the BFF
---

What’s supported (verified in routes)

- Standard JSON GET/POST/PUT/DELETE across canonical `/api/...` routes.
- Server-Sent Events (SSE) routes exist in `routes.yaml` (e.g., `crud-events`, `crud-events-workflow-status`) with `streaming: true`.

Uploads

- Use `fetch`/`apiClient` with `FormData` and `Content-Type` managed by the browser; cookies are sent automatically.
- Ensure a corresponding `routes.yaml` route points to an upstream endpoint that accepts multipart.

Downloads

- Use `fetch` and read `blob()`; cookies are included for auth. The BFF will proxy binary responses transparently.

SSE

- Use `EventSource` against BFF `/api/...` endpoints; when cross-origin, ensure CORS allows your UI origin. Cookies will be used by the browser as usual when same-origin.

WebSockets

- No explicit WebSocket routes are defined in `routes.yaml`; not documented as supported in this repo.


