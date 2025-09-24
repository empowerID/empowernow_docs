## How‑to: Approver resolver plugins

Goal: Add or configure approver resolvers for approval tasks.

### Prerequisites

- CRUD Service running with plugin discovery enabled
- Access to `plugins/approver_resolvers/`

### 1) Configure an approval node

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

### 2) Use the built‑in role resolver

- Reads role membership (via ConfigLoader) and returns allowed approvers.
- Supports username→ARN normalization with optional provider derivation.

```mermaid
flowchart TD
  A[approval_config] --> B[RoleApproversResolver]
  B --> C[roles.yaml via ConfigLoader]
  C --> D[allowed_approvers]
  D --> E[task approval_data]
```

### 3) Implement a custom resolver

```python
class FooResolver(ApproverResolver):
    def __init__(self, config_loader):
        self.config_loader = config_loader

    async def initialize(self, config: dict) -> None:
        ...

    async def resolve_approvers(self, approval_config: dict, context: dict | None = None) -> dict:
        return {"allowed_approvers": ["auth:account:provider:alice"], "policy_decision": "OK", "expiration": None}

    async def validate_approver(self, user_id: str, current_approval_data: dict, context: dict | None = None) -> bool:
        return user_id in set(current_approval_data.get("allowed_approvers", []))

    async def shutdown(self) -> None:
        ...
```

### 4) Reference your resolver in workflows

Set `approval_config.approver_resolver: "foo.FooResolver"` and redeploy.

### 5) Validate decisions

- On decision, the engine loads the resolver, verifies the actor, and applies thresholds.
- Approve/reject terms are normalized via `approval_synonyms.yaml`.

Troubleshooting

- Resolver not found: check plugin path/class name and plugin loader configuration.
- Not authorized: confirm normalization to ARNs and role membership inputs.

See also

- IdP: PEP to PDP request and obligation handling — `services/idp/backend/pep-pdp-request.md`
- PDP: Obligations & delegation (who may approve) — `services/pdp/backend/obligations-and-delegation.md`

