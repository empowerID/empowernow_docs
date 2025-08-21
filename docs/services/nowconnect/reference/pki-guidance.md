## PKI Guidance for NowConnect

This page covers CA hierarchy, certificate content (SANs), issuance, rotation sequencing, and revocation strategies for NowConnect mesh and optional agent mTLS at ingress.

### CA hierarchy and trust

| Use | Recommended CA |
|---|---|
| Mesh `/mesh` mTLS | Private enterprise CA (intermediate) dedicated to mesh |
| Agent mTLS (optional at ingress) | Same enterprise CA or a separate profile |

Avoid using public CAs for internal mesh links.

### Certificate content

- SANs must include DNS names used in `ha.mesh.peers` (e.g., `cloud-a.example.com`). Modern clients ignore CN for name checks.
- Key usage: `Digital Signature`; Extended Key Usage: `TLS Web Client Authentication` for client, `TLS Web Server Authentication` for server as applicable.

### Rotation sequencing (mesh)

```mermaid
sequenceDiagram
  participant CA as CA/PKI
  participant ING as Ingress
  participant HUB as Cloud Hubs

  CA->>ING: Issue new server cert (SAN includes mesh host)
  ING->>ING: Deploy new cert+key; keep old CA trusted
  CA->>HUB: Issue new client certs per hub
  HUB->>HUB: Deploy new client certs + updated CA bundle
  ING->>HUB: Allow both old/new during overlap
  Note over ING,HUB: Verify `/mesh` reconnect succeeds using new material
  ING->>ING: Remove old server cert after overlap window
  HUB->>HUB: Remove old client certs after overlap window
```

### Revocation strategy

- Prefer short-lived certificates and rotation over CRL/OCSP complexity.
- If revocation is required, use OCSP stapling at ingress and restrict trust to a narrow intermediate.

### SAN allowlist and validation

- Keep peer endpoints tight; avoid wildcard SANs. Monitor for unexpected SANs issued under the mesh CA.

### Alerts and monitoring

- Cert expiry alerts (see HA architecture page). Track TLS errors and reconnects as early indicators.


