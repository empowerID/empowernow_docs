# Agents rollout and backout plan

Flags
- AGENT_WS_ENABLED (default true)
- AGENT_AWAITING_INPUT_ENABLED (default true)
- AGENT_REDACTION_ENFORCED (default true)
- AGENT_RATE_LIMIT_ENABLED (default true)
- AGENT_MAX_CONCURRENT_PER_SUBJECT (default 5)

Rollout
1. Enable redaction + awaiting-input features for canary tenant(s).
2. Enable WS chat for Visual Designer only; monitor errors and truncation metrics.
3. Increase AGENT_MAX_CONCURRENT_PER_SUBJECT gradually based on saturation.
4. Monitor Prometheus metrics: agent_runs_total, agent_stream_truncated_total, cancellations.

Backout
- Disable WS chat (AGENT_WS_ENABLED=false) to fall back to HTTP streaming.
- Set AGENT_AWAITING_INPUT_ENABLED=false to use legacy single-turn behavior.
- Set AGENT_REDACTION_ENFORCED=false if regressions are linked to encoder changes.
- Reduce AGENT_MAX_CONCURRENT_PER_SUBJECT to 0 for emergency freeze.

Observability
- Ensure OTEL collector healthy; logs are scrubbed of sensitive info.
- Verify audits include resource_ref and do not leak plaintext.


