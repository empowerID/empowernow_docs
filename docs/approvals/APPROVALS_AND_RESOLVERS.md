## Approvals and Approver Resolvers

This guide explains how approval tasks work end‑to‑end, how approver resolvers are plugged in, and how the system exposes approvals via APIs. It ties together these files:

- CRUDService/src/loaders/approver_plugins.py
- CRUDService/plugins/approver_resolvers/role_approvers.py
- CRUDService/src/tasks/approval_refresh.py
- CRUDService/src/engine/graph_executor/user_interaction/approval_handler.py
- CRUDService/config/approval_synonyms.yaml
- CRUDService/src/services/approval_synonym_service.py
- CRUDService/src/providers/task_provider.py
- CRUDService/src/api/task_routes.py
- CRUDService/src/providers/postgres_task_provider.py

### High‑level architecture

- Approval nodes in workflows delegate “who can approve?” to a resolver plugin.
- The resolver returns an allowed_approvers list, persisted on the task.
- When an approver submits a decision, the system validates the actor against the resolver result and decision synonyms.
- A background refresh job can re‑resolve approvers for pending tasks to reflect org changes.

### Lifecycle flow

1) Workflow reaches an approval node
- The node’s `approval_config` names a resolver, e.g. `role_approvers.RoleApproversResolver`, and any inputs such as `role_required`.

2) Resolve approvers (plugin)
- The engine loads the resolver via the plugin loader and calls `resolve_approvers(approval_config, context)`.
- The response contains `allowed_approvers` which is written to task config/metadata.

3) Create approval task and wait
- A DB‑backed task is created with `interaction_type = APPROVAL`, config includes the `approval_config` and resolved `approval_data`.
- The workflow goes to WAITING.

4) Approver decision
- The approver posts a decision. The system normalizes it using `approval_synonyms.yaml`, verifies the approver is authorized (resolver `validate_approver`), records the vote, and applies thresholds.

5) Completion/rejection/partial
- If thresholds are met and the decision is approve → node completes. If rejected → node fails with an error. Otherwise stays pending (e.g., multi‑approver scenarios).

### Key components and responsibilities

- Approver resolver interface (plugins)
  - Contract for computing `allowed_approvers` and validating a specific approver at decision time.
  - File: `src/loaders/approver_plugins.py` (example plugin contract) and `src/approvers/base.py` (runtime interface used by the engine).

- Default resolver: role_approvers
  - Reads role membership (via `ConfigLoader` → `roles.yaml`) and returns members as allowed approvers. Supports username→ARN normalization and provider derivation.
  - File: `plugins/approver_resolvers/role_approvers.py`.

- Approval synonyms
  - Centralized list of approve/reject keywords; used to normalize decisions.
  - Files: `config/approval_synonyms.yaml`, `src/services/approval_synonym_service.py`.

- Task provider and DB storage
  - Creates approval tasks, stores `approval_data`, validates decisions against resolver, updates status, and supports refresh.
  - Files: `src/providers/task_provider.py`, `src/providers/postgres_task_provider.py`.

- HTTP API routes
  - List/get/complete tasks, plus “my pending approvals” for the current user.
  - File: `src/api/task_routes.py`.

- Workflow engine integration
  - Emits WAITING approval tasks and validates responses using the selected resolver plugin.
  - File: `src/engine/graph_executor/user_interaction/approval_handler.py`.

- Background refresh job
  - Periodically re‑resolves approvers for pending tasks to reflect org/role changes.
  - File: `src/tasks/approval_refresh.py`.

## Approver resolver plugins

### Contract

At runtime, resolvers implement:

```python
class ApproverResolver:
    async def resolve_approvers(self, approval_config: dict, context: dict | None = None) -> dict: ...
    async def validate_approver(self, user_id: str, current_approval_data: dict, context: dict | None = None) -> bool: ...
    async def initialize(self, approval_cfg: dict) -> None: ...        # optional lifecycle
    async def shutdown(self) -> None: ...                               # optional lifecycle
```

Return shape for `resolve_approvers` should include:

```python
{
  "allowed_approvers": ["auth:account:provider:alice", "auth:account:provider:bob"],
  "policy_decision": "ROLE_MANAGER_OK",
  "expiration": None
}
```

### Loading and selection

- Workflows specify a resolver by fully‑qualified plugin name, e.g. `role_approvers.RoleApproversResolver`.
- The engine loads it through the plugin loader and calls `resolve_approvers` during task creation and `validate_approver` during decision processing.

### Example: RoleApproversResolver

- Inputs (in `approval_config`):
  - `role_required`: the role name to resolve.
  - `required_count` (optional): approval threshold handled at the engine level.
- Behavior:
  - Loads role membership from `roles.yaml` via `ConfigLoader`.
  - Normalizes usernames to canonical ARNs when possible (deriving `provider` from context or principal ARN).
  - Honors `CRS_ENFORCE_CANONICAL_ARNS=true` to require ARNs only.
  - `validate_approver` checks the actor is in the final approver set (considering optional `override_approvers`).

## Workflow authoring

### Configure an approval node

```yaml
nodes:
  await_manager_approval:
    type: USER_INTERACTION
    config:
      interaction_type: approval
      approval_config:
        approver_resolver: "role_approvers.RoleApproversResolver"
        role_required: "Manager"
        required_count: 1
```

Notes:
- `approver_resolver` selects the plugin.
- Add any resolver‑specific inputs under `approval_config` (e.g., `role_required`).
- Use `required_count` for N‑of‑M approvals.

## Engine behavior (creation + response)

### When creating the task

- The engine resolves approvers via the selected resolver and persists `approval_data` (the list of allowed approvers) in the task config.
- The task is set to PENDING and the workflow goes to WAITING.

### When handling a response

1) Normalize decision:
- Decision text is normalized against `approval_synonyms.yaml` (approve vs reject synsets).

2) Validate actor:
- The engine dynamically loads the same resolver and calls `validate_approver` with the latest resolution and context.
- It also checks the actor appears in the `approval_resolver_output` list.

3) Apply thresholds and transition:
- Maintains `approved_by` / `rejected_by` sets and `approval_history`.
- Completes the node on approve + threshold met; fails on reject; remains pending otherwise.

## Task provider and storage

### Create task

- For APPROVAL tasks, if a resolver is configured at service startup, `create_task` persists the `approval_data` returned by the resolver.

### Complete task

- On decision, the provider:
  - Normalizes the decision via synonyms.
  - Optionally re‑validates the actor with `_approver_resolver.validate_approver` using the stored `approval_data`.
  - Sets status to COMPLETED (approve) or REJECTED (reject) and persists response, metadata, and timestamps.

### Refresh approval data

- `refresh_approval_tasks()` re‑resolves approvers for PENDING approval tasks and updates `approval_data` if it changed.
- Honors `override_approvers` to skip automated updates for tasks that have been manually locked down.

## Approval synonyms

### Config

File: `config/approval_synonyms.yaml`

```yaml
approval_decisions:
  - approve
  - approved
  - yes
  - voteyes
  - accept
  - confirmed
  - approvedconditionally

rejection_decisions:
  - reject
  - rejected
  - no
  - voteno
  - deny
  - notapproved
  - revoke
```

### Service helpers

- `ApprovalSynonymService` provides CRUD utilities to read/update the synonyms file, with de‑duplication and simple validation.

## APIs

### List tasks

- `GET /tasks` with rich filtering (`status`, `type`, `workflow_id`, `created_by`, date ranges, search) and ETag/Last‑Modified support.

### Get one task

- `GET /tasks/{task_id}` returns the full task payload including `config`, `status`, timestamps, metadata, and response.

### Complete task (post decision)

- `POST /tasks/{task_id}/complete` with body containing `decision` and optional `metadata`/custom `data`. The provider applies resolver validation and transitions the task.

### Pending approvals for me

- `GET /tasks/approvals/pending` returns PENDING approval tasks where the current user is in the allowed approver list, with short‑TTL caching.

## Background job: approval_refresh

- Intended to run periodically to keep approvers up‑to‑date for PENDING tasks. Useful when org charts/roles change.
- Skips tasks that include `override_approvers` in config.

## Operational guidance

- Resolver selection
  - Prefer policy‑driven resolvers (e.g., roles or PDP‑authorized checks). Keep business rules out of workflow graphs where possible.

- Normalization & identity
  - Use ARNs where possible. If using usernames, ensure provider context is available so normalization to canonical ARNs can occur.
  - Set `CRS_ENFORCE_CANONICAL_ARNS=true` to require canonical identities only.

- Thresholds
  - Use `required_count` for multi‑approver gates. The engine tracks `approved_by` and `rejected_by` and evaluates threshold on each decision.

- Overrides
  - Set `override_approvers` on a task to freeze approvers for that task and opt‑out of bulk refresh updates.

- Synonyms hygiene
  - Keep `approval_synonyms.yaml` small, unambiguous, and auditable. Use the provided service methods to add/remove terms to avoid duplicates.

- Refresh cadence
  - Run the refresh job on a short interval only if approver sets are volatile; otherwise, align with org updates to reduce churn.

## End‑to‑end example

1) Workflow node

```yaml
nodes:
  approve_payment:
    type: USER_INTERACTION
    config:
      interaction_type: approval
      approval_config:
        approver_resolver: "role_approvers.RoleApproversResolver"
        role_required: "CostCenterOwner"
        required_count: 2
```

2) Task creation (service)

- The provider writes `approval_data: ["auth:account:empowernow:alice", "auth:account:empowernow:bob", ...]` into the task config.

3) Approver calls complete

```http
POST /tasks/{task_id}/complete
Content-Type: application/json

{
  "decision": "approve",
  "data": {"comments": "LGTM"}
}
```

- The provider normalizes the decision, validates the actor via resolver, updates task status, and the engine transitions the node if thresholds are met.

## Extending with a new resolver

1) Create a plugin in `plugins/approver_resolvers/` implementing the `ApproverResolver` contract.

```python
class FooResolver(ApproverResolver):
    def __init__(self, config_loader):
        self.config_loader = config_loader

    async def initialize(self, config: dict) -> None:
        pass

    async def resolve_approvers(self, approval_config: dict, context: dict | None = None) -> dict:
        # compute allowed approvers
        return {"allowed_approvers": ["auth:account:provider:alice"], "policy_decision": "OK", "expiration": None}

    async def validate_approver(self, user_id: str, current_approval_data: dict, context: dict | None = None) -> bool:
        return user_id in set(current_approval_data.get("allowed_approvers", []))

    async def shutdown(self) -> None:
        pass
```

2) Reference it from a workflow node via `approval_config.approver_resolver: "foo.FooResolver"`.

3) Ensure your plugin is discoverable by the PluginLoader (correct directory and naming) and that any required configuration is available via `ConfigLoader` or environment.

## Troubleshooting

- “User not authorized to approve”
  - The actor is not in the resolver’s `allowed_approvers` at decision time. Check normalization, provider context, and role membership inputs.

- “Resolver not found”
  - The plugin name in `approver_resolver` does not match a discoverable class. Verify plugin path and loader configuration.

- Decision rejected as invalid
  - The value did not match any synonyms. Update `approval_synonyms.yaml` via the service if needed, then retry.

---

If you need a concrete walk‑through or a new resolver template wired into your environment, reach out and we’ll scaffold it end‑to‑end.


