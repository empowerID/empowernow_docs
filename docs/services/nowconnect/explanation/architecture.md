## Architecture & Design

NowConnect replaces Azure Relay with a single outbound TLS WebSocket tunnel that multiplexes many TCP streams.

### Components

- Cloud Hub (FastAPI):
  - `/tunnel` WebSocket endpoint authenticates premise agents (JWT)
  - TCP listeners bind real ports and map to connectors
  - Single WS receive loop per agent; per‑agent send lock; bounded per‑CID queues
  - Idle handling, backpressure, structured logs, Prometheus metrics

- Premise Agent (asyncio):
  - Maintains one `wss://` connection through proxies/CA bundle
  - Sends `HELLO` (agent_id, tenant, connectors, version)
  - On `OPEN(connector)`: dials on‑prem target and relays bytes
  - Reconnects with exponential backoff; refreshes JWT from file

### Protocol

JSON frames: `HELLO`, `HELLO_ACK`, `OPEN`, `DATA{seq}`, `FIN{dir}`, `RST{err}`. Full close after both FINs or on RST.

### Operational Guardrails

- Bounded queues with overflow → `RST` and teardown
- Chunking (`max_ws_payload`) and `writer.drain()` / `ws.send()` backpressure
- Idle/connect timeouts; sweeper to FIN idle CIDs
- Metrics and alerts for reconnects, queue overflow, connection caps

