# Product — Orchestration: Self‑Driving Workflows

## Overview
Self‑Driving Workflows let AI agents execute complex operations with zero prior training. Workflows are self‑explanatory to LLMs: the system returns next steps, decision options, and AI‑native visualizations, so agents proceed safely under policy.

- No‑code builder for agent tools and workflows
- Zero‑shot execution responses tailored for agents
- Governed by AuthZEN constraints and Membership graph

## Key capabilities
- Zero‑shot detection: when minimal input is provided, responses include full instructions and guardrails for the agent
- Global “Next Paths”: which nodes can run next in parallel, with explanations and metadata
- Node‑centric decisions: possible decisions per node with consequences and parallelism hints
- AI‑native visuals: full workflow Mermaid diagram and per‑node mini‑diagrams, color‑coded by status
- Enhanced response format: `ai_context`, `next_paths`, `node_specific_next_paths`, `node_mermaid_diagrams`, `domain_insights`
- Resumable execution: `/start` and `/resume/{task_id}` maintain and refresh agent‑friendly context

## Global next paths (high‑level planning)
The workflow engine builds an execution roadmap that surfaces ready nodes and parallelizable paths. Agents learn:
- Which nodes can run next
- Which dependencies are satisfied
- What decision options exist and their effects

## Node‑centric decisions (fine‑grained control)
For user‑interaction or decision nodes, the engine enumerates allowed choices and pre‑evaluates the outgoing conditions:
- `decision`: the option available at this node
- `triggers_nodes`: which downstream nodes will run
- `explanation`: natural language description of consequences
- `metadata`: parallel execution flag, node type, etc.

## AI‑native Mermaid diagrams
The system returns Mermaid diagrams designed to be consumed by LLMs and humans alike:
- Full workflow diagram with status color‑coding (active, completed, waiting, failed, future)
- Per‑node diagrams showing local decision paths
- Edge labels include decision conditions

## Enhanced response (specimen)
```json
{
  "status": "WAITING_FOR_INPUT",
  "workflow_id": "f8a7b612-3e45-4e67-9ab2-f56c89d3e7a1",
  "data": { },
  "mermaid_full": "graph TD\n start[\"start\"]...",
  "next_paths": [
    {
      "decision": "proceed",
      "triggers_nodes": ["collect_user_info", "verify_identity"],
      "explanation": "2 node(s) can run next in parallel",
      "metadata": {"node_types": ["USER_INTERACTION", "ACTION"]}
    }
  ],
  "node_specific_next_paths": {
    "user_approval": [
      {
        "decision": "approve",
        "triggers_nodes": ["create_account"],
        "explanation": "Choosing 'approve' triggers 1 node(s)",
        "metadata": {"parallel_execution": false, "node_type": "USER_INTERACTION"}
      },
      {
        "decision": "reject",
        "triggers_nodes": ["notify_rejection"],
        "explanation": "Choosing 'reject' triggers 1 node(s)",
        "metadata": {"parallel_execution": false, "node_type": "USER_INTERACTION"}
      }
    ]
  },
  "node_mermaid_diagrams": {
    "user_approval": "graph LR\n current[user_approval]..."
  },
  "ai_context": {
    "instructions": "Review the account creation request...",
    "constraints": ["no_auto_approve_above_risk_score_70", "require_manager_approval_above_5000"],
    "success_criteria": ["verified_identity", "proper_documentation"],
    "allowed_decisions": ["approve", "reject", "escalate"],
    "agent_protocol": {
      "conversation_state": "initial_review",
      "required_checks": ["compliance", "risk_score"]
    }
  },
  "domain_insights": {
    "risk_assessment": "low",
    "compliance_status": "check_required",
    "suggested_action": "verify_identity"
  }
}
```

## Start and resume APIs
- Start: `POST /workflows/start` → returns enhanced response with `mermaid_full`, `next_paths`, `ai_context`
- Resume: `POST /workflows/resume/{task_id}` → applies input, recomputes diagrams and next paths, and returns a refreshed enhanced response

## Guardrails and governance
- PDP constraints guide execution: params allowlists, egress allowlists, `data_scope`, `step_up`, and spend/plan limits
- Every permit emits a signed, hash‑chained receipt via the Receipt Vault

## Why this matters
- Agents move safely through complex workflows without bespoke training
- Humans and agents share the same visual language for process state
- Governance is built in: identity, authorization, boundary enforcement, and audit

CTAs: Start a workflow → See enhanced response → View Mermaid examples
