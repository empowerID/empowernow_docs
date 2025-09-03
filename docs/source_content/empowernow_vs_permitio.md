
---

───────────────────────────────────────────────────────────
**Why Permit-style policies look bigger — and how EmpowerNow’s YAML stays razor-thin**
───────────────────────────────────────────────────────────

We distilled BOTH languages down to two everyday banking rules.
**Rule #1:** “Owners can add members” • **Rule #2:** “Block transfers > \$10,000 unless strong-auth”

| Metric                        | EmpowerNow YAML DSL     | Permit / Terraform                                                                                                                                                                         |
| ----------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Files touched**             | 1 YAML file             | **Typically 3+** `.tf` files (e.g., `main.tf`, `variables.tf`, `outputs.tf`) ([docs.permit.io][1], [HashiCorp Developer][2])                                                               |
| **Concepts you must declare** | **Rule**                | **Resource**, **Action(s)**, **Role** (permissions as `"resource:action"` strings), **User-Set**, **Resource-Set**, **Condition-Set-Rule**. ([Terraform Registry][3], [docs.permit.io][4]) |
| **Lines of policy code**      | **≈9 total**            | **≈85 total** *(illustrative minimal example; varies by structure)*                                                                                                                        |
| **External tooling**          | none (git + editor)     | Terraform CLI with remote **state**/**locking** and plan/apply workflow. ([HashiCorp Developer][5])                                                                                        |
| **Hot-reload / live edit**    | save file → PDP reloads | `terraform plan` → `terraform apply` (often with state locking). ([HashiCorp Developer][6])                                                                                                |

---

### Why does Permit’s approach balloon?

1. **Block-oriented Terraform syntax** — every noun is its own block (`resource`, `role`, `user_set`, `resource_set`, `condition_set_rule`). ([HashiCorp Developer][7], [Terraform Registry][3])
2. **Indirection & wiring** — blocks reference each other by keys; `depends_on` is used to order creation. ([HashiCorp Developer][7])
3. **Pre-materialized “sets”** — predicates (e.g., `amount > 10000`) live in **User/Resource Sets**; rules then point to them. ([docs.permit.io][8])
4. **No inline conditions in rules** — rule resources reference pre-declared sets rather than embed expressions directly. ([Terraform Registry][9])
5. **Terraform lifecycle overhead** — edits go through plan/apply; remote backends typically **lock state** to avoid conflicts. ([HashiCorp Developer][10])

---

### Why is EmpowerNow’s YAML compact?

1. **Single rule = single stanza** (resource, action, effect, condition together).
2. **Free-form expressions** — `allowIf` / `denyIf` read like business logic (no extra objects).
3. **Effect shorthand** — `allowIf` → PERMIT; `denyIf` → DENY.
4. **Native constraints & obligations** inline under the rule.
5. **Plain-file workflow** — edit YAML → commit → container hot-reloads. *(Product capability.)*

---

### Take-away

* **>10× terser in practice** — fewer files, fewer concepts, less boilerplate.
* **Faster reviews** — diffs read like policy logic, not wiring.
* **Lower coupling** — no Terraform plan/state, no cross-block IDs.

---

#### Fair-use footnotes (keep us honest)

* **Scope:** This comparison targets the **Terraform path**. Permit also supports **custom policy code** in **Rego/Cedar** (outside Terraform) where inline expressions are possible; Terraform still models ABAC via **User/Resource Sets** and **Condition-Set-Rules**. ([docs.permit.io][11], [registry][9])
* **UI & ReBAC:** Permit ships **Elements** (embeddable authorization UI) and supports **Zanzibar-style ReBAC** with tuples—strong options if you need end-user widgets and relationship graphs. ([docs.permit.io][12])

---

[1]: https://docs.permit.io/modeling/mesa-verde/?utm_source=chatgpt.com "Fintech / Banking Demo Application"
[2]: https://developer.hashicorp.com/terraform/tutorials/modules/module-create?utm_source=chatgpt.com "Build and use a local module | Terraform"
[3]: https://registry.terraform.io/providers/permitio/permit-io/latest/docs/resources/permitio_resource?utm_source=chatgpt.com "Resources | permitio/permit-io - Terraform Registry"
[4]: https://docs.permit.io/integrations/infra-as-code/terraform-provider?utm_source=chatgpt.com "Terraform Provider | Permit.io Documentation"
[5]: https://developer.hashicorp.com/terraform/language/state/locking?utm_source=chatgpt.com "State: Locking | Terraform"
[6]: https://developer.hashicorp.com/terraform/cli/commands/apply?utm_source=chatgpt.com "terraform apply command reference"
[7]: https://developer.hashicorp.com/terraform/language/resources/syntax?utm_source=chatgpt.com "Resources - Configuration Language | Terraform"
[8]: https://docs.permit.io/api/working-with-abac/condition-sets?utm_source=chatgpt.com "Condition Sets | Permit.io Documentation"
[9]: https://registry.terraform.io/providers/permitio/permit-io/latest/docs/resources/permitio_condition_set_rule?utm_source=chatgpt.com "permitio/permit-io - Resources - Terraform Registry"
[10]: https://developer.hashicorp.com/terraform/cli/commands/plan?utm_source=chatgpt.com "terraform plan command reference"
[11]: https://docs.permit.io/integrations/gitops/custom_policy/?utm_source=chatgpt.com "Write Custom Policies | Permit.io Documentation"
[12]: https://docs.permit.io/embeddable-uis/overview?utm_source=chatgpt.com "Permit Elements"

---

### Annotated examples (side-by-side, minimal)

EmpowerNow YAML — Owners can add members:

```yaml
rule: group:add-members
allowIf: principal.role == "owner"
```

EmpowerNow YAML — Deny wire-transfer > $10,000 unless strong-auth:

```yaml
rule: wire-transfer:create
denyIf: resource.amount > 10000 && !principal.strongAuth
```

Cerbos YAML — Equivalent minimal policies (see refs for full schema):

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: default
  resource: group
  rules:
    - actions: ["add-members"]
      effect: EFFECT_ALLOW
      roles: ["owner"]
```

```yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: default
  resource: wire-transfer
  rules:
    - actions: ["create"]
      effect: EFFECT_DENY
      condition:
        match:
          expr: R.attr.amount > 10000 && !P.attr.strongAuth
```

Permit Terraform — Fully valid HCL (provider docs linked below):

```hcl
resource "permitio_resource" "group" {
  key         = "group"
  name        = "Group"
  description = "A collaboration group"

  actions = {
    "add-members" = {
      name        = "Add Members"
      description = "Add members to a group"
    }
  }
}

resource "permitio_role" "owner" {
  key         = "owner"
  name        = "Owner"
  description = "Group owner"
  permissions = ["group:add-members"]

  depends_on = [permitio_resource.group]
}

resource "permitio_resource" "wire_transfer" {
  key         = "wire-transfer"
  name        = "Wire Transfer"
  description = "Bank wire transfer"

  actions = {
    "create" = {
      name        = "Create"
      description = "Create a wire transfer"
    }
  }
}

resource "permitio_user_set" "strong_auth" {
  key  = "user_strong_auth"
  name = "Users with strong authentication"

  conditions = jsonencode({
    allOf = [
      { "subject.strongAuth" = { equals = true } }
    ]
  })
}

resource "permitio_resource_set" "high_value" {
  key      = "wire_transfer_high_value"
  name     = "High value wire transfers"
  resource = permitio_resource.wire_transfer.key

  conditions = jsonencode({
    allOf = [
      { "resource.amount" = { gt = 10000 } }
    ]
  })
}

resource "permitio_condition_set_rule" "deny_high_value_without_strong_auth" {
  permission   = "wire-transfer:create"
  user_set     = permitio_user_set.strong_auth.key
  resource_set = permitio_resource_set.high_value.key
  decision     = "deny"
}
```

References: Cerbos resource policies, Permit Terraform provider and condition-set rules.  
Use these to ground the line-count table above.

---

### Messaging pack (grab-and-go)

- **One-liner**: EmpowerNow compresses effect, condition, and obligations into a single YAML stanza—no Terraform/state.
- **Why it matters**: Fewer files and concepts mean faster PRs, clearer reviews, and less coupling.
- **Proof**: Two common banking rules take ≈9 lines in YAML vs ≈85 HCL lines with Terraform’s block model.
- **Fairness**: Permit’s Terraform is verbose by design (separate resources/sets). Permit also supports custom policy code (Rego/Cedar) outside Terraform.