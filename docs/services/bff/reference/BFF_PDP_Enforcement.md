---
id: bff-llm-pdp-enforcement
title: BFF PDP Enforcement for AI Chat Completions
sidebar_label: AI Chat Completions (PDP Enforcement)
tags: [service:bff, type:reference, roles:developer, roles:architect]
---

## ARIA AI Agent Proxied Policy Enforcement

### Overview
- The BFF provides a governed, OpenAI-compatible `/chat/completions` endpoint. It authenticates users, authorizes via PDP (AuthZEN), enforces preflight rules (model allowlist, guardrails, redaction, token caps), pins egress, manages budget holds/settlements in Redis, proxies to the provider, and emits tamper-evident receipts. An optional journaling pipeline can persist masked prompts and feed sanitized analytics to ClickHouse.

### Edge routing & topology
```mermaid
graph TB
  subgraph Edge
    Traefik["Traefik (routers)"]
  end
  subgraph App
    BFF["BFF Service"]
  end
  subgraph Backends
    PDP["PDP"]
    CRUD["CRUDService (others)"]
    Analytics["Analytics"]
  end
  Traefik -->|"/chat/completions"| BFF
  Traefik -->|"/api/**"| BFF
  BFF -->|"/access/v1/*"| PDP
  BFF -->|"/api/crud/*"| CRUD
  BFF -->|"/api/v1/analytics/*"| Analytics
```

### Purpose
- **What**: How the BFF gates and governs `/chat/completions` using PDP (AuthZEN) constraints and obligations, then enforces preflight rules, egress, budgets, streaming caps, and emits receipts.
- **Who**: Software developers and architects; cloud and AI security architects; product and technical product marketing managers.
- **Status**: Implemented for OpenAI; Anthropic is a roadmap extension.

### Core enforcement architecture (implemented)
```mermaid
graph TB
  subgraph Client
    UI["Client / Agent"]
  end

  subgraph Control
    PDP["PDP (AuthZEN)"]
    RV["Receipt Vault"]
  end

  subgraph DataPlane
    BFF["BFF (/chat/completions)"]
    OAI["OpenAI API"]
  end

  subgraph State
    R["Redis (budgets, last-receipt)"]
  end

  UI -->|POST /chat/completions| BFF
  BFF -->|Evaluate| PDP
  BFF -->|Proxy| OAI
  BFF -->|Emit| RV
  BFF <--> R
```

### Full architecture with optional journaling & analytics
```mermaid
graph TB
  subgraph Client
    UI["UI / Agents"]
  end
  subgraph Control
    PDP["PDP (AuthZEN)"]
    RV["Receipt Vault"]
  end
  subgraph DataPlane
    BFF["BFF (/chat/completions)"]
    OpenAI["OpenAI API"]
  end
  subgraph Stores
    R["Redis (budget/receipt-last)"]
    PJ["Prompt Journal (optional)"]
    K["Kafka (sanitized, optional)"]
    CH["ClickHouse (optional)"]
  end
  UI -->|"POST /chat/completions"| BFF
  BFF -->|"evaluate"| PDP
  BFF -->|"call"| OpenAI
  BFF -->|"sign receipt"| RV
  BFF <--> R
  BFF -. "optional journal" .-> PJ
  PJ -. "sanitized events" .-> K
  K -. "ingest" .-> CH
```

### Non-stream and stream flows (with inline enforcement)
```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant B as BFF
  participant P as PDP
  participant R as Redis (budget)
  participant O as OpenAI
  participant V as ReceiptVault

  C->>B: POST /chat/completions
  B->>P: PDP evaluate (resource llm:openai:chat)
  P-->>B: Permit + constraints
  B->>B: Preflight (allowlist, guards, redact, token caps)
  B->>R: Hold(budget_estimate)

  alt stream=false
    B->>O: POST /v1/chat/completions
    O-->>B: JSON {choices, usage}
    B->>R: Settle(actual)
    B->>V: Emit receipt (Allow + usage + policy snapshot)
    B-->>C: JSON response
  else stream=true
    B->>O: POST /v1/chat/completions (stream)
    O-->>B: SSE deltas
    B->>B: Stream guard (cap/leakage)
    B-->>C: SSE relay (+ early termination on policy)
    B->>R: Settle(estimate)
    B->>V: Emit receipt (Allow + estimate + policy snapshot)
  end
```

### Constraints vs obligations (policy → runtime)
```mermaid
flowchart LR
  subgraph Decision
    PDP["PDP decision"] --> C["Constraints"]
    PDP --> O["Obligations"]
  end

  subgraph Enforced Inline
    MC["Model allow"]
    PR["Prompt guardrails"]
    RD["Redaction patterns"]
    TK["Token caps"]
    EG["Egress allow"]
  end

  subgraph Enforced Async
    RC["Emit receipt"]
  end

  C --> MC --> PR --> RD --> TK --> EG
  O --> RC
```

### Enforcement pipeline (step-by-step)
```mermaid
flowchart TD
  A["Start"] --> B{"PDP Permit?"}
  B -- "No" --> Z["403 Deny"]
  B -- "Yes" --> C["Model allowlist"]
  C -- "Fail" --> Z
  C --> D["Prompt guards (phrases, links, URL allowlist)"]
  D -- "Fail" --> Z
  D --> E["Apply redaction patterns"]
  E --> F["Set token caps (max_output/stream)"]
  F --> G{"Egress host allowed?"}
  G -- "No" --> Z
  G -- "Yes" --> H["Budget hold (Redis)"]
  H -- "Fail" --> Y["402 Budget insufficient"]
  H -- "OK" --> I{"Streaming?"}
  I -- "No" --> J["OpenAI call"]
  J --> K["Settle (actual usage)"]
  K --> L["Emit receipt"]
  L --> X["Return JSON"]
  I -- "Yes" --> S["OpenAI stream"]
  S --> T["Stream guard (cap/leakage)"]
  T --> U["Settle (estimate)"]
  U --> V["Emit receipt"]
  V --> W["Return SSE"]
```

### Implementation anchors (code)
- Endpoint, PDP evaluate, egress allow, preflight, budget, proxy, settle, receipt, streaming
  - `ms_bff_spike/ms_bff/src/api/v1/endpoints/llm.py`
- Preflight rules (allowlist, guards, redaction, token caps)
  - `ms_bff_spike/ms_bff/src/services/llm_enforcement.py`
- Stream-time guard (leakage and caps)
  - `ms_bff_spike/ms_bff/src/services/llm_sse.py`
- Budgeting (hold/settle/release)
  - `ms_bff_spike/ms_bff/src/services/llm_budget.py`
- Receipts (non-blocking, hash-chained; Vault optional)
  - `ms_bff_spike/ms_bff/src/services/llm_receipts.py`
- PDP policy (models, token limits, egress allow)
  - `ServiceConfigs/pdp/config/policies/applications/aria-bff/openai-chat.yaml`

### Interfaces and headers
- Request (OpenAI-compatible): `{ model, messages[], stream?, max_tokens? }`
- Response
  - Non-stream: OpenAI JSON passthrough; headers may include `x-aria-decision-id`.
  - Stream: SSE datums; early termination with warning when caps/guards trigger.

### Security posture
- PDP-driven, centralized policy for model selection, egress, token caps, and guardrails.
- Fail-secure: missing mapping or PDP errors → 403. Budget insufficiency → 402.
- No prompt content in receipts; journaling (if enabled separately) stores masked content only.
- Egress pinning eliminates provider endpoint drift.

### Configuration (runtime)
- `OPENAI_BASE` default `https://api.openai.com/v1`
- `OPENAI_API_KEY` (supports secret pointers)
- `RECEIPT_VAULT_URL` (optional; dev fallback when unset)
- PDP client credentials from BFF settings (enterprise SDK)

### Metrics to watch
- `LLM_CALLS_TOTAL{mode,result}`
- `BFF_LLM_BUDGET_DENIED_TOTAL`
- `BFF_LLM_STREAM_TRUNCATIONS_TOTAL`

### Scope and roadmap
- Implemented: OpenAI proxy with PDP, enforcement, budgets, receipts, streaming guard.
- Roadmap: Anthropic (`/v1/messages`, `x-api-key`, `anthropic-version`), provider selection logic, additional constraints/obligations (consent/DLP), optional prompt journaling pipeline.


