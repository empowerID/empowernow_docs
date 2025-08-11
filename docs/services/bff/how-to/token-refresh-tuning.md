---
title: Tune Token Refresh Thresholds
---

The architecture docs specify refreshing access tokens a few minutes before expiry, with singleflight locks and jitter to prevent thundering herds.

Flow (from docs)

```mermaid
sequenceDiagram
  participant BFF
  participant IdP
  BFF->>BFF: Check token expiry
  alt Expires soon
    BFF->>BFF: Acquire per-session lock
    BFF->>BFF: Add small jitter (0–30ms)
    BFF->>IdP: Refresh token
    IdP-->>BFF: New access token
    BFF->>BFF: Store in session
  else Not soon
    BFF-->>BFF: Continue
  end
```

What to adjust

- Refresh window: default ~5 minutes (per docs). Increase if IdP is slow; decrease for short‑lived sessions.
- Jitter: keep small (tens of ms) to avoid synchronized refreshes.

Verify

- Check logs for refresh attempts and success/fail counters (see metrics page).
- Simulate near‑expiry sessions and ensure only one refresh happens per session window.


