## Testing Guide (Matrix, Fault Injection, Acceptance)

This guide defines a test matrix, acceptance criteria, and fault-injection scenarios for NowConnect Cloud and Premise Agent.

### Test matrix

| Dimension | Values |
|---|---|
| Platforms | Linux containers (cloud/agent), Windows/macOS agent where applicable |
| TLS versions | 1.2, 1.3 (prefer 1.3 where supported) |
| Proxies | None, corporate proxy (`NC_TRUST_ENV=true`) |
| Loss/latency | 0–2% loss; 5–100ms RTT; jitter ±20ms |
| HA modes | off, shadow, active |
| IdP | JWKS online/offline; key rotation; invalid aud |
| PDP (optional) | allow, deny, timeout (fail-open/off) |

### Acceptance criteria

- Latency: added overhead ≤ configurable SLO (e.g., LDAP p95 < 20ms intra-region).
- Error budget: < 0.1% connection failures under nominal load.
- Reconnect behavior: agent recovers within 5s median after network flap.
- HA active: cross-replica delivery succeeds with no data loss; FIN/RST handled correctly.

### Fault injection scenarios

1. Mesh partition: drop `/mesh` path at ingress.
   - Expect: local-only flows succeed; cross-replica fail; `/readyz` degraded in active mode.
2. Redis outage: stop Redis or block port.
   - Expect: local-only mode; `/readyz` degraded in active; registry sweeper resumes after restore.
3. TLS failure: present wrong CA or expired cert for `/mesh`.
   - Expect: TLS errors; mesh reconnect loops; alerts fire.
4. JWT issues: wrong `aud`, expired token, revoked key.
   - Expect: WS upgrade rejects; agent retries; alert on auth failures.
5. PDP timeout/deny (if enabled): return 500ms timeout or explicit deny.
   - Expect: default deny unless `fail_open=true`; log decision.

### Perf pipeline (example)

```mermaid
flowchart LR
  LG[Load Gen (LDAP)] --> NC[NowConnect]
  NC --> MET[Prometheus]
  MET --> EVA[SLO Eval]
  EVA --> REP[Report]
```

### Repro kits

- Sample IdP: provide JWKS and token generator.
- Synthetic connectors: echo TCP and mock LDAP.
- Packet capture: run `tcpdump`/`wireshark` on agent host for troubleshooting.


