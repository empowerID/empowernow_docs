---
title: Enable Raw Mode Safely
---

## Goal
Allow raw storage under strict consent, retention, and DLP obligations.

## Steps
1. Policy: enable `prompt_archive.mode=raw` with retention caps and DLP obligation.
2. IdP: collect user consent (JARM) and attach proof; PEP validates or downgrades to sanitized.
3. Journal: encrypt raw fragments/blobs with tenant keys; avoid Kafka for raw.

```mermaid
sequenceDiagram
  participant AG as Agent
  participant B as BFF (PEP)
  participant P as PDP
  participant I as IdP (Consent)
  participant J as Journal
  AG->>B: Request (wants raw)
  B->>P: evaluate
  P-->>B: constraints(mode=raw)+obligations(consent,DLP)
  B->>I: collect consent
  I-->>B: proof
  B->>J: write masked + raw(enc)
```

## See also
- BFF enforcement: `services/bff/reference/BFF_PDP_Enforcement.md`

