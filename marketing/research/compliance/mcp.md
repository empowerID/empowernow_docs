# ARIA MCP Gateway — Compliance Posture

## Overview
```mermaid
flowchart LR
  CF[Cloudflare AI Gateway]
  Portkey[Portkey]
  Helicone[Helicone]

  CF --> Trust1[Trust/Compliance]
  Portkey --> Trust2[Trust/Compliance]
  Helicone --> Trust3[Trust/Compliance]
```

## Attestations and Trust Links (collect and verify)
- Cloudflare AI Gateway (Cloudflare):
  - Cloudflare Trust Hub / Compliance: https://www.cloudflare.com/trust-hub/
- Portkey:
  - Vendor security/compliance resources
- Helicone:
  - OSS + hosted; vendor security/compliance resources

## Notes
- Scope: SOC 2 Type II, ISO 27001; confirm applicability to gateway products and hosted plans.
- Evidence: preserve URLs, quote claims, record dates/report IDs.
- Mapping: observability/routing vs enforcement; attestations cover platform operations, not necessarily governance features.
