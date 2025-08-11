---
title: SSE and WebSockets — Guidance
---

SSE (Server‑Sent Events)

- Several SSE routes are defined in `routes.yaml` (e.g., `crud-events*`) with `streaming: true`. Use `EventSource` from the SPA; same‑origin cookies are sent automatically.

WebSockets

- No explicit WebSocket routes are defined in `routes.yaml`. If needed, add routes and ensure Traefik/WebSocket headers are preserved; otherwise prefer SSE for simple push.

Timeouts/headers

- Keep idle timeouts high enough for SSE; ensure CORS and cookies align in dev if cross‑origin.


