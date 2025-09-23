### Secure every human, service, and AI agent with one Identity & Authorization Fabric

- What it is: One fabric that puts the same policy in front of your APIs, apps, and AI agents. Includes ARIA Shield (gateway), Authentication, Authorization, Automation Studio, and Inventory.

- Why it matters:
  - Real‑time authorization on every request and tool/model call
  - Policy‑enforced budgets and limits to control AI spend
  - Reduce data‑exfiltration risk and prevent privilege misuse with enforceable guardrails
  - Clear audit trails and evidence for compliance
  - Adopt incrementally; run cloud or self‑hosted; data stays in your tenant; approvals and segregation of duties (SoD) supported
  - Config‑as‑code (YAML) with PR‑gated changes and instant rollback

### What you get
- ARIA Shield (Gateway)
  - One secure front door for apps and agents (server‑side login/session)
  - Real‑time policy checks and budget enforcement on API, tool, and model calls
  - Built‑in guardrails: tool attestation, receipts
  - Logs to your SIEM; no tokens in the browser
  - Per‑call enforcement returns allow/deny with reason; receipts retrievable via API
  - Optional mTLS to upstreams; per‑route rate limits and allowlists
- Authorization (Policy Engine)
  - OpenID AuthZEN‑compliant PDP; obligations & budgets; enforcement (PEPs) across services
  - Break‑glass and deny‑all controls; per‑route kill switches
- Authentication (IdP)
  - Standards‑based sign‑in with short‑lived, scoped tokens
  - Works with Okta and Microsoft Entra ID
  - Simple header‑based integration for agents and services
- Automation Studio (No‑Code connectors as authorized MCP Tools)
  - Build and publish connectors as MCP Tools without code; policy checks on every run with approvals, budgets, and receipts
  - Declarative, versioned tool schemas; policies and budgets applied per tool
  - Secrets via CyberArk/Vault; least‑privilege service identities
- Inventory (No‑Code inventory connectors for any IGA)
  - Continuous discovery for contextual policy; feeds SailPoint/EmpowerID and others

### Use cases
- Govern human and AI agent usage with real‑time authorization, spend limits, and budgets — with developer‑friendly allow/deny signals and receipts for troubleshooting
- Standards‑based real‑time authorization (OpenID AuthZEN) for apps and AI processes
- No‑code connectors and graph workflows as MCP tools for agents and humans
- Zero‑trust API front door for SPAs/mobile: one origin, consistent enforcement and logs

### Why we’re different
- One policy everywhere: same decisions at the gateway and in services
- Agent‑ready by design: guardrails and spend controls for tools and model calls
- Open, vendor‑agnostic components you can adopt incrementally

### Coexistence
- Keep Okta/Microsoft Entra (sign‑in), SailPoint/EmpowerID (IGA), CyberArk/HashiCorp Vault (secrets/session)
- EmpowerNow adds unified authorization and an agent‑aware gateway with budgets and receipts

### Open standards
- OpenID AuthZEN + governed OAuth; OIDC/SCIM/CAEP supported

### Get started
- Quickstart: ARIA Shield + Authentication + Authorization; add Automation Studio and Inventory as you grow
 - Deployment: containers (Kubernetes or VM); integrates with existing IdP/SIEM
- Contact: identityfabric@empowernow.ai