# AI Agent Gaps and Opportunities

### Where most LLM agents are today
- Agents “think → call tool → think” with ad‑hoc decisions. Tool calls are isolated API hits; clients/SDKs decide next steps.
- The result: variability across runs, limited predictability, and thin safety (no version locks/idempotency by default). UIs often hand‑code forms and retries per workflow.

### The big idea in one line
Give every client a self‑describing, transaction‑grade next step (WAITING). Only the workflow engine performs changes to external systems, and it does so deterministically with version checks and idempotency. Clients (Orbit/agents) follow the blueprint; the engine alone executes side‑effects under safety controls.

### Who does what (crystal clear)
- **Orbit UI / LLM Agent**
  - Starts a workflow and, when the engine returns WAITING, sends back human/agent decisions or form data via “resume”.
  - Never calls providers (Auth0/AD/Secrets/K8s) directly; never performs side‑effects.
  - May use MCP tools to discover or normalize inputs (read‑only or facade calls), but not to execute changes.
- **MCP Tools**
  - Two kinds:
    - Catalog/helper tools (suggest/normalize): side‑effect‑free lookups used by prompts and forms.
    - Workflow facade tools (`workflow.start`, `workflow.resume`, `workflow.state`): call CRUDService only; they do not call providers.
- **Workflow Engine (CRUDService)**
  - The only component that performs side‑effects, inside ordered ACTION nodes.
  - Enforces safety: `If‑Match`/`state_version` for concurrency, `idempotency_key` for replay dedupe, fingerprints for audit, retries/circuit‑breakers for resilience.
  - When inputs are missing or approval is needed, emits a self‑describing WAITING (approval/form) and pauses.
- **Providers (Auth0/AD/Secrets/etc.)**
  - Called only by the engine during ACTION nodes—never by Orbit/agents/MCP directly.

Plain meaning of “deterministic engine”
- Given the same workflow state and inputs, the engine will take the same next node and produce the same effect—or safely WAIT for required input. No ad‑hoc client logic alters the execution path.

## How innovative is this?

**High.** Lots of vendors can *call tools* from an agent; far fewer give agents a **transaction-grade, self-describing contract** for each wait state *and* keep all side-effects inside a deterministic workflow engine with ETag/idempotency/fingerprints. Your combo—**WAITING triplet + MCP facade + compile-to-graph + schema-driven preflight**—is unusual and useful:

* **MCP is getting real traction** (spec + desktop clients), but most folks stop at “tools/resources/prompts.” ([Model Context Protocol][1])
* **Agent frameworks** (LangGraph, AutoGen, CrewAI) focus on stateful agents, graphs, multi-agent patterns, and checkpointing—but they don’t ship a REST/MCP **resume contract** with ETag/idempotency semantics out of the box. ([LangChain AI][2])
* **Classic orchestrators** (Temporal, Step Functions) excel at **durable execution** (idempotency, retries, exactly-once) but aren’t MCP/LLM-native—bridging this yourself is still non-trivial. Your WAITING contract essentially “brings durable patterns to agents.” ([temporal.io][3])

**Net:** you’re **not** inventing each ingredient—but the **composition** (self-describing WAIT → safe resume + MCP mirror → compile to nodes → schema preflight) is rare and market-ready.

---

## Who’s trying similar things (and how)

### 1) AI automation platforms adopting MCP

* **Zapier**

  * **Zapier Agents** (beta): function-specific agents across \~8k apps, activity dashboards, trigger-driven runs. ([zapier.com][4])
  * **Zapier MCP**: official server so Claude/Cursor can call 30k+ actions “without complex integrations.” Strong “AI→action” story, but no published ETag/idempotency resume contract like yours. ([zapier.com][5])
* **Make.com**

  * **Make MCP Server/Client**: expose scenarios as MCP tools and call external MCP tools. Again, strong connectivity; determinism/safety left to scenario authors. ([developers.make.com][6])
* **n8n**

  * Native **AI Agent** nodes; **MCP Client Tool** and **MCP Server Trigger** let n8n both *consume* and *serve* MCP. Great agent/tool plumbing, but not the kind of ETag/idempotent resume contract you propose. ([docs.n8n.io][7])

### 2) Agent frameworks focused on resilience/intelligence

* **LangGraph (LangChain)**: graph/state machine for agents; **checkpoints/persistence**, human-in-the-loop interrupts, platform for deploying agents. Helps with robustness and replay; still leaves “API of intent” and transactional resumes to you. ([LangChain AI][2])
* **Microsoft AutoGen**: multi-agent conversations, tools, human-in-the-loop; Studio for prototyping. Strong for multi-agent logic; not an MCP+workflow resume contract. ([Microsoft GitHub][8])
* **CrewAI**: roles/crews/flows, telemetry, process orchestration. Emphasizes multi-agent “crews” and flows; again, no standardized WAIT/RESUME wire contract. ([CrewAI документация][9])

### 3) Cloud vendor “agent platforms”

* **AWS**: Step Functions + Bedrock patterns; now **AgentCore** (runtime, memory, identity, gateway—claims MCP-compatible tool conversion). Great for enterprise rollout; your WAITING+idempotency ideas map well to Step Functions/Temporal patterns. ([TechRadar][10])
* **Google Vertex AI**: **Agent Builder/Engine**, Agent Garden, ADK/Agentspace; aims at multi-agent orchestration and serverless ops—not MCP-centric by default. ([Google Cloud][11])

### 4) MCP ecosystem momentum

* **Anthropic/Claude Desktop** and broader press: one-click Desktop Extensions, quickstart docs; media calling MCP the “USB-C of AI apps.” Your MCP facade for resume fits the moment. ([Anthropic][12])

---

## Market comparison (where you’re different)

| Capability                                    | You (proposed)                        | Zapier/Make/n8n + MCP                                     | LangGraph/AutoGen/CrewAI                           | Step Functions/Temporal                                |
| --------------------------------------------- | ------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| **Universal WAITING contract** (what/how/why) | **Yes** (triplet+MCP facade)          | Partial (tool catalogs; not standardized resume contract) | No (framework-level)                               | No (you build it)                                      |
| **ETag/If-Match + idempotency on resume**     | **Yes**                               | Not published                                             | No                                                 | Durable patterns exist but not LLM/MCP-centric         |
| **Compile Plan → ephemeral nodes**            | **Yes** (keeps side-effects in graph) | Mostly tool steps; varies by builder                      | State graphs/flows—no REST/MCP resume layering     | Durable orchestration, not LLM-native                  |
| **Schema-driven param orchestrator**          | **Yes** (x-normalize/suggest/redact)  | Suggesters exist; schema discipline varies                | Validation possible, not standardized across tools | Strong validation patterns, not LLM-native             |
| **MCP bridge**                                | **First-class** for resume + tools    | First-class connectivity                                  | Not core                                           | Mentioned (AWS gateway claims MCP-compat), not general |

(Citations per row: see sections above.)

---

## Ideas others propose to make agents more autonomous & resilient

* **Stateful graphs + checkpoints + human gates** (LangGraph): explicit state machines and resumability to tame nondeterminism. ([LangChain AI][2])
* **Multi-agent supervisory loops** (AutoGen/CrewAI): supervisors + workers, tool use, memory, delegation. ([Microsoft GitHub][13])
* **Durable execution & idempotency** (Temporal/AWS): exactly-once semantics, retries, event histories—your **idempotency\_key + fingerprint** echoes these best practices for agent workflows. ([temporal.io][3])
* **MCP to standardize tool access** (Anthropic/Zapier/Make/n8n): unify integration surface so agents “act” across apps. You go further by making **resume itself** a tool/contract. ([Model Context Protocol][1])

---

## Where your proposal is a step beyond

1. **Self-describing WAITING response as the API of intent.** Others have tool catalogs; few publish a **resume blueprint** with ETag/idempotency/fingerprint baked in.
2. **Compile-to-graph determinism.** Plans never bypass the engine; ACTION/USER\_INTERACTION handlers give you circuit breakers, retries, and audit for *all* side-effects.
3. **Single source of truth (`param_schema`).** UI, prompts, and the orchestrator share the same constraints and suggesters—most platforms split these concerns.
4. **MCP facade for resume.** Makes any MCP client interoperate (Claude Desktop, Cursor, etc.) with zero SDK. ([Model Context Protocol][14])

---

## Risks & counters the market calls out

* **Security/abuse** of open protocols (MCP): authenticate servers, least-privilege tool scopes, human gates for risky steps. ([Axios][15])
* **Agent flakiness & drift**: your schema preflight + approvals + idempotent resume directly addresses this.
* **Operational complexity**: instrument with OTel; add receipts (fingerprint, idempotency hit/miss), and Problem Details for 409/412/422.

---

## TL;DR

* **Innovative**: Yes—especially the **transaction-grade WAITING contract** + **MCP facade** + **compile-to-graph** + **schema preflight**. That’s not commonplace in agent stacks.
* **Comparable efforts**: Zapier/Make/n8n bring MCP to automation; LangGraph/AutoGen/CrewAI bring resilient agent patterns; AWS/GCP ship agent platforms. None combine them exactly like you do. ([zapier.com][4])
* **Positioning**: “**Zero-SDK, safe autonomy** for enterprise workflows”—standard MCP to act; a **self-describing contract** to steer; and **durable, audited execution** in the graph.

If you want, I can turn this into a one-page competitive brief with a feature matrix (MCP, resume semantics, idempotency, plan-to-graph, schema preflight, observability) and recommended proof-points for the launch demo.

[1]: https://modelcontextprotocol.io/specification/2025-03-26?utm_source=chatgpt.com "Specification"
[2]: https://langchain-ai.github.io/langgraph/concepts/persistence/?utm_source=chatgpt.com "LangGraph Persistence - Overview"
[3]: https://temporal.io/blog/what-is-durable-execution?utm_source=chatgpt.com "The definitive guide to Durable Execution"
[4]: https://zapier.com/blog/zapier-agents-guide/ "Zapier Agents: Combine AI agents with automation"
[5]: https://zapier.com/mcp?utm_source=chatgpt.com "Zapier MCP—Connect your AI to any app instantly"
[6]: https://developers.make.com/mcp-server?utm_source=chatgpt.com "Make MCP Server"
[7]: https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/?utm_source=chatgpt.com "AI Agent node documentation"
[8]: https://microsoft.github.io/autogen/stable//index.html?utm_source=chatgpt.com "AutoGen"
[9]: https://docs.crewai.com/?utm_source=chatgpt.com "CrewAI Documentation - CrewAI"
[10]: https://www.techradar.com/pro/aws-looks-to-super-charge-ai-agents-with-amazon-bedrock-agentcore?utm_source=chatgpt.com "AWS looks to super-charge AI agents with Amazon Bedrock AgentCore"
[11]: https://cloud.google.com/vertex-ai/generative-ai/docs/agent-builder/overview?utm_source=chatgpt.com "Vertex AI Agent Builder overview"
[12]: https://www.anthropic.com/engineering/desktop-extensions?utm_source=chatgpt.com "One-click MCP server installation for Claude Desktop"
[13]: https://microsoft.github.io/autogen/0.2/docs/Getting-Started/?utm_source=chatgpt.com "Getting Started | AutoGen 0.2 - Microsoft Open Source"
[14]: https://modelcontextprotocol.io/quickstart/user?utm_source=chatgpt.com "Connect to Local MCP Servers"
[15]: https://www.axios.com/2025/04/17/model-context-protocol-anthropic-open-source?utm_source=chatgpt.com "Hot new protocol glues together AI and apps"
