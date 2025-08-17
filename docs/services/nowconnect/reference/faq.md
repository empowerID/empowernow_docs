## FAQ

- **Does it support SSH/Telnet/ODBC/LDAP?** Yes. It tunnels raw TCP; configure cloud listeners and premise targets.
- **Will LDAPS/StartTLS work?** Yes. TLS terminates end‑to‑end at the target; the tunnel is transparent.
- **What if the WS drops?** All active CIDs close; the agent reconnects with backoff. New connections work after reconnect.
- **How do we prevent OOM?** Bounded per‑CID queues, small chunk sizes, natural backpressure, idle timeouts. Overflow triggers `RST`.
- **Multiple agents per connector?** V1: first‑come wins. V2: add Redis presence + routing policy.
- **Binary protocol?** Optional later (V1.1) to avoid base64 overhead; semantics unchanged.

