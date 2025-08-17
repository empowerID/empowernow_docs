## Metrics & Observability

Prometheus metrics (low‑cardinality labels: `connector`, `side` where applicable):

- `nowconnect_tcp_connections_total`
- `nowconnect_tcp_active_connections`
- `nowconnect_tcp_bytes_total{direction="c2p|p2c"}`
- `nowconnect_tunnel_reconnects_total{agent,reason}`
- `nowconnect_tunnel_uptime_seconds{agent}`
- `nowconnect_listener_accept_errors_total{connector}`
- `nowconnect_queue_overflow_total{side,connector}`
- `nowconnect_fin_sent/fin_recv/rst_sent/rst_recv`
- `nowconnect_pdp_allow_total/nowconnect_pdp_deny_total`
- `nowconnect_pdp_errors_total`
- `nowconnect_connection_duration_seconds` (histogram)

Health endpoints:

- `/healthz` — process alive
- `/readyz` — WS server up (cloud) / tunnel established (premise)
- `/metrics` — Prometheus scrape

Logging: structured JSON without payloads; include `event`, `cid`, `agent_id`, `connector`, `seq`, sizes, timings; redact sensitive values.

### Health/readiness semantics
- Agent: single TCP health server; returns `OK` prior to HELLO/ACK, `READY` after ACK. Use `tcpSocket` probes in k8s.
- Cloud: `/healthz` (alive), `/readyz` (WS server up and accepting). Use Prometheus `/metrics` for scraping.

