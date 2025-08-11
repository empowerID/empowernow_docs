---
title: Enable Redis TLS for Sessions
---

Goal: encrypt BFF↔Redis traffic for session data.

Options (architecture/tests)

- Native TLS (`rediss://`): configure Redis to listen with TLS and point BFF to `rediss://host:6379`.
- Sidecar (stunnel): run a local TLS proxy in front of Redis and keep BFF on `redis://localhost:<proxy>`.

Suggested steps

1) Enable TLS on Redis (or deploy a managed Redis with TLS)
2) Update BFF env to `rediss://` with certs as needed
3) Validate with a ping and session read/write

Rotation

- Keep certs in your secret store; rotate and reload without downtime by updating the secret mount and restarting the sidecar.


