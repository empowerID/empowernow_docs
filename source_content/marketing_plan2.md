I'll create a short research todo list and start with a first batch of web scans on AI authorization, AuthZEN, MCP, and hyperscalers to gather fresh sources.

[1 tool called]

Starting with hyperscalers/standards scan to gather up-to-date references on AI authorization, MCP, and AuthZEN, then I'll parallel-scan identity vendors.

[5 tools called]

Marking the hyperscalers/standards scan as done, I’ll quickly pull fresh references for key vendors (Okta, Axiomatics, PlainID, Permit.io, Cerbos) and governance players (Saviynt, SailPoint, CyberArk) to ground the competitor section with current sources.

[5 tools called]

I'll gather targeted, up-to-date references for each named competitor and standards to ground the analysis, then synthesize findings and a differentiation summary.

[5 tools called]

I completed targeted scans across standards (AuthZEN, OAuth on-behalf-of), MCP adoption, hyperscalers (AWS, Azure, Cloudflare), and key IAM/authorization vendors. I’ll mark the research tasks done and present a concise market landscape and our differentiation.

[1 tool called]

### Market scan: AI authorization, agent delegation, and who’s shaping the conversation

- **Standards and protocols**
  - **AuthZEN (OpenID Authorization API)**: Converging toward 1.0; standardizes PDP/PEP evaluation APIs (/evaluation, /evaluations). Relevance: your ARIA PEP directly aligns.
  - **OAuth “on‑behalf‑of AI Agents” (draft)**: Emerging proposals to extend OAuth for explicit agent delegation and auditable actor chains.
  - **MCP (Model Context Protocol)**: Rapid adoption across agent ecosystems; security/governance layer on top (a PEP) is an open opportunity.

- **Hyperscalers and infra**
  - **Cloudflare AI Gateway**: Analytics, logging, caching, retries, token/cost metrics. Costs are estimated—not an enforcement primitive. No user‑bound agent identity or AuthZEN-style authorize/deny with constraints.
  - **AWS Bedrock Guardrails**: Configurable filters (safety categories, PII, prompt‑attack). Great content controls, not per‑user agent authorization or budget enforcement.
  - **Azure AI Content Safety / Prompt Shields**: Prompt/jailbreak detection, filtering, groundedness signals. Useful inputs to policy—still not authorization.
  - Net: Hyperscalers ship content filters and observability; not per‑agent authorization, plan/budget enforcement, MCP tool governance, or cryptographic receipts.

- **Identity/IAM vendors**
  - **Ping Identity**: Thought leadership on agentic AI IAM (scale, autonomy, mixed identities, governance). No full PEP + budget enforcement solution.
  - **Okta/Saviynt/SailPoint/CyberArk**: Strong in identity governance, PAM, lifecycle. Early content on agents; limited concrete PEP for MCP tools or spend governance today.
  - Net: They frame identity and governance; few have agent‑specific PEP patterns yet.

- **Authorization vendors (ABAC/ReBAC/PDP/embedded)**
  - **Axiomatics, PlainID**: Dynamic authorization (ABAC/PBAC) that could back a PEP; not focused on MCP tool boundary controls or receipts.
  - **Permit.io, Cerbos**: Developer‑friendly policy engines. Useful components; do not ship an AI‑agent gateway with AuthZEN PEP, budgets, receipts, and MCP controls.
  - Net: Great policy backends; missing the ARIA “agent gateway + budget + receipts” system.

### What people are proposing online
- Extend OAuth/OIDC for auditable agent delegation (actor tokens, requested_actor).
- Apply agency law principles: explicit, limited, revocable delegation; clear audit trails.
- Zero‑trust identity for agents (DIDs/VCs) and zero‑trust egress.
- Observability and safety filters as inputs, but not a substitute for runtime authorization.

### How EmpowerNow ARIA is unique
- **AuthZEN‑native PEP for agents and tools**: Standard eval flow; constraints/obligations as first‑class.
- **Enforceable spend + plan contracts**: Idempotent budget debits, plan‑step verification, 402 budget_exceeded with reasons.
- **MCP‑aware enforcement at the tool boundary**: Schema pins with rollout windows, param allowlists, egress allowlists, identity chaining (feature‑flag) when allowed by policy.
- **Cryptographic receipts**: Signed, hash‑chained records with policy snapshot and params hash; optional KMS anchoring.
- **Bring‑your‑PDP**: Works with AuthZEN‑aligned PDPs; keeps policy concerns separate from runtime enforcement.

### Competitor snapshot (high level)
- Hyperscalers (AWS, Azure, Cloudflare): Safety filters, analytics, infra. No per‑agent authorization + budget enforcement + receipts.
- IAM (Okta, Ping, Saviynt, SailPoint, CyberArk): Identity lifecycle and governance; early “agentic IAM” guidance, limited concrete MCP‑PEP solutions.
- AuthZ vendors (Axiomatics, PlainID, Permit.io, Cerbos): Strong policy engines; no turnkey AI‑agent gateway with budgets/receipts.

### What to publish now (to lead the narrative)
- “Authorization for AI Agents” series: AuthZEN PEP patterns, MCP schema pins, plan contracts/budgets, cryptographic receipts.
- “From estimated cost to enforced budgets”: contrast with Cloudflare’s estimates; show ARIA’s idempotent debits + receipts.
- “How to consume safety filters in authorization”: Azure Prompt Shields/Bedrock Guardrails as constraints inputs, not decisions.
- Reference demo: deny‑before‑call, budget cap, receipt chain; MCP tools (GitHub/Jira/Drive) with schema pins and egress allowlists.

If you want, I can convert this into a public‑facing analyst brief and a website ARIA landing draft next.