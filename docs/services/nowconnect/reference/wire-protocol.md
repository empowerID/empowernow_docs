## Wire Protocol (V1 JSON; V1.1 Binary later)

Frames are JSON sent as WebSocket text frames.

```json
{ "t":"HELLO", "agent_id":"premise-01", "connectors":["addomain","devdomain1"], "ver":"1.5" }
{ "t":"HELLO_ACK" }
{ "t":"OPEN",  "cid":"<uuid>", "connector":"addomain" }
{ "t":"DATA",  "cid":"<uuid>", "seq":123, "b64":"<base64-bytes>" }
{ "t":"FIN",   "cid":"<uuid>", "dir":"c2a|a2c" }
{ "t":"RST",   "cid":"<uuid>", "err":"connect_failed|ws_broken|queue_overflow" }
```

- Chunking: max payload size `max_ws_payload`; increment `seq` per `cid`.
- Half‑close: full close after both directional FINs, or immediate on RST.
- Binary header (V1.1) can replace JSON without behavior change.

