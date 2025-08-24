# PDP Policy DSL – Author & Auditor Guide

*Last updated 6/1/2025 – all examples validated with the live `YAMLPolicyParser`.*

---

## 0  Introduction
This guide complements the quick-reference cheat-sheet and walks you through **writing, reviewing and auditing** policies using the PDP's DSL (supporting ABAC, PBAC and ReBAC patterns).

*   **Syntax flexibility** – choose between classical `effect + when` or sugar-based `allowIf/denyIf`, `all/any/none`, `If/Then/Else`.
*   **Human-readable** – every rule can be read aloud; obligations/constraints add enforcement hooks.
*   **Deny-override** – if **any** rule with effect **deny** matches, the whole request is denied.
*   **LLM-friendly** – sample system-prompt provided in a separate file (`docs/llm_prompt.md`).

---

## 1  Policy Anatomy (quick recap)
```
Policy  → metadata + subjects[] + rules[]
Rule    → resource + action + effect/condition + obligations/constraints
Effect  → permit | deny  (implicitly set by sugar fields)
```

### 1.1 Metadata
`id`, `name`, `version`, `description`, `schema_version`, `type`, `policy_type`, `terms`.

### 1.2 Subjects
* Static:
  ```yaml
  subjects:
    - type: user
      id: alice@example.com
  ```
* Dynamic (predicate):
  ```yaml
  subjects:
    - where: subject.properties.roles IN ['admin','manager']
  ```

### 1.3 Rules
Minimal sugar style:
```yaml
- resource: account
  action: create
  allowIf: subject.department == 'Finance'
```
Same rule, "classic" style:
```yaml
- resource: account
  action: create
  effect: permit
  when: subject.department == 'Finance'
```

---

## 2  Syntactic-Sugar Catalogue
| Sugar | Meaning | Notes |
|-------|---------|-------|
| `allowIf` | Sets effect **permit** when expression true | shorthand for `effect: permit` + `condition:` |
| `denyIf`  | Sets effect **deny**  when expression true | |
| `when`    | Alias for `condition:` (classic style) | |
| `all` / `any` | Conjunction / disjunction list | inside `allowIf`, `denyIf`, `when`, `unless`, etc. |
| `none`    | NOT(OR(list)) | |
| `unless` / `exceptIf` | Negate the inner condition | |
| `If / Then / Else` | Branching – expands to `(IF and THEN) OR (NOT IF and ELSE)` | |

*Remember: sugar overrides an `effect:` you explicitly set—avoid mixing styles inside one rule.*

---

## 3  Conditions – Operator Reminders
Use uppercase logical connectors **`AND` / `OR` / `NOT`**.  Supported comparison operators:
```
== != > < >= <= IN NOT IN LIKE NOT LIKE MATCHES NOT MATCHES
```
Avoid deprecated patterns:
* ✅ `context.attributes.delegator_id != None`
* ❌ `context.attributes.delegator_id is not None`
* ✅ `subject.flag == true`
* ❌ `subject.flag == True`  (capital *T* unquoted becomes Python, not YAML)

### 3.1 Guarded permits — prefer `when` for "permit-only-on-match"

**Audience:** Policy authors and reviewers

**Goal:** Avoid accidental over-permitting by using the correct guard construct

#### Correct mental model
- **Rule applicability**
  - A rule first matches by `resource` and `action`. Only then do `condition`/sugar fields influence outcome.
- **`allowIf` (conditional override)**
  - If condition is true → the rule’s effect becomes permit.
  - If condition is false → the rule keeps its base effect. The rule still applies (it is not `not_applicable`).
- **`when` (guard/condition)**
  - If condition is true → the rule applies and enforces its effect.
  - If condition is false → the rule is `not_applicable` (it contributes neither permit nor deny).
- **Final default**
  - If no applicable rule permits, the final decision is deny. There’s no global “fallback to permit.”

#### Why this matters
Authors often intend “permit only when the condition holds.” With `allowIf` + `effect: "permit"`, a false condition keeps the base effect `permit` and still permits. Use `when` for guard semantics so a false condition yields `not_applicable`.

#### Anti-pattern (over-permitting)
Behavior: false condition → base effect stays permit; rule still permits.

```yaml
# Avoid: allowIf + effect: permit (acts as override, not a guard)
- description: "EntraID user forms"
  resource: "form"
  action: ["read","submit","update"]
  effect: "permit"
  allowIf: "resource.properties.resource_id in ['av_entraid_create_user_form','av_entraid_view_user_form']"
```

#### Recommended pattern (true guard)
Behavior: true → permit; false → `not_applicable` (other rules decide; default deny if none permit).

```yaml
# Use when for “permit only on match”
- description: "EntraID user forms (guarded)"
  resource: "form"
  action: ["read","submit","update"]
  effect: "permit"
  when: "resource.properties.resource_id in ['av_entraid_create_user_form','av_entraid_view_user_form']"
```

#### Alternatives (choose by style)
- Default-deny and open on match:

```yaml
- description: "EntraID user forms (default deny)"
  resource: "form"
  action: ["read","submit","update"]
  effect: "deny"
  allowIf: "resource.properties.resource_id in ['av_entraid_create_user_form','av_entraid_view_user_form']"
```

- Default-permit but explicitly deny non-listed:

```yaml
- description: "EntraID user forms (deny negative)"
  resource: "form"
  action: ["read","submit","update"]
  effect: "permit"
  denyIf: "resource.properties.resource_id not in ['av_entraid_create_user_form','av_entraid_view_user_form']"
```

#### Do / Don’t
- Do: use `when` to guard permits so non-matches are `not_applicable`.
- Don’t: pair `allowIf` with `effect: "permit"` when you intend a guard.
- Do: put dynamic attributes under `resource.properties.*` and `subject.properties.*`.
- Don’t: use `conditions` (plural) — it’s unsupported.

#### Lint rule suggestion
- Flag “`allowIf` present AND `effect: permit`” unless explicitly waived; suggest replacing with `when` or flipping base `effect` to `deny`.

#### Testing checklist
- Positive: matching `resource_id` → permit via this rule.
- Negative: non-matching id → rule `not_applicable`; final allow only if another rule permits; otherwise deny.

---

## 4  Obligations & Constraints
Attach obligations on permit **or** deny:
```yaml
on_permit:
  obligations:
    - id: require_mfa
      attributes:
        level: high
```
Constraints may be embedded as a list or under `on_permit.constraints`.  The parser tags them with `_constraint: true` so the evaluator can enforce them.

Example numeric limit:
```yaml
constraints:
  - id: spend_cap
    type: numeric_limit
    value: 5000
```

---

## 5  Worked Examples
### 5.1 Basic allow / deny
```yaml
rules:
  - resource: document
    action: view
    allowIf: subject.department == 'Engineering'

  - resource: document
    action: delete
    denyIf: subject.properties.sensitivity == 'high'
```

### 5.2 `none` sugar
```yaml
allowIf:
  none:
    - subject.hrStatus == 'Suspended'
    - subject.hrStatus == 'Terminated'
```

### 5.3 `If / Then / Else`
```yaml
If: subject.role == 'ProdAdmin'
Then: true                # permit immediately
Else: subject.hasFeatureToggle == true
```

### 5.4 Path-attribute matching
```yaml
path_attributes:
  - name: doc_path
    type: path
    patterns:
      - "/docs/public/*.pdf"
      - "/docs/internal/**"

rules:
  - resource: document
    action: view
    effect: permit
    when: "resource.properties.full_path MATCHES doc_path"
```

---

### 5.5 Environment & time helpers
```yaml
- resource: report
  action:   view
  effect:   permit
  when: { operator: during_business_hours }

- resource: batch
  action:   run
  effect:   permit
  when: { operator: after_time, right: "06:00" }
```

### 5.6 CIDR and IP range
```yaml
- resource: api
  action:   call
  effect:   permit
  allowIf:
    any:
      - { operator: cidr_match, scope: context, attribute: request_ip, value: "10.0.0.0/8" }
      - { operator: cidr_match, scope: context, attribute: request_ip, value: "192.168.1.0/24" }
```

### 5.7 Velocity and money operators
```yaml
- resource: payment
  action:   submit
  effect:   deny
  denyIf:
    operator: velocity_within
    scope: subject
    attribute: id
    value: { window_minutes: 60, count: 5 }

- resource: expense
  action:   approve
  effect:   permit
  allowIf:
    operator: money_less_than
    left:  { ref: "resource.properties.amount" }
    right: { currency: "USD", value: 1000 }
```

### 5.8 If / Then / Else branching
```yaml
- resource: record
  action:   view
  effect:   permit
  If:   "subject.properties.department == 'Sales'"
  Then: { allowIf: "resource.properties.region == 'EMEA'" }
  Else: { allowIf: "resource.properties.is_public == true" }
```

---

## 6  Application-Scoped Policy Organization

The PDP supports **application-scoped policies** that provide better governance, performance, and organization. Instead of loading all global policies for every request, you can organize policies by application using a 5-level inheritance hierarchy.

### 6.1 How It Works

Include the `pdp_application` field in your AuthZEN request:

```json
{
  "subject": {"type": "user", "id": "alice@example.com"},
  "action": {"name": "view"},
  "resource": {
    "type": "document", 
    "id": "doc-123",
    "properties": {
      "pdp_application": "sharepoint-prod"
    }
  }
}
```

The PDP will:
1. **Extract** the application ID from `resource.properties.pdp_application`
2. **Resolve** the application context using the Application Registry
3. **Load policies** from the 5-level inheritance hierarchy (see below)
4. **Cache results** for optimal performance

### 6.2 Five-Level Inheritance Hierarchy

Policies are organized in a hierarchy where **more specific overrides general**:

1. **APPLICATION** (Level 1) - Highest priority, most specific
2. **DOMAIN_ENVIRONMENT** (Level 2) - Domain + environment specific  
3. **CROSS_ENVIRONMENT** (Level 3) - Cross-environment domain policies
4. **DOMAIN_SHARED** (Level 4) - Shared domain policies
5. **GLOBAL** (Level 5) - Global fallback policies

### 6.3 Directory Structure Example

```text
config/policies/
├── global/                           # Level 5: Global policies
│   ├── authentication.yaml
│   └── base-security.yaml
├── domains/
│   └── sharepoint/                   # Domain: sharepoint
│       ├── shared/                   # Level 4: Domain shared
│       │   ├── document-actions.yaml
│       │   └── user-roles.yaml
│       ├── cross-environment/        # Level 3: Cross-environment
│       │   └── compliance.yaml
│       └── environments/
│           ├── production/           # Level 2: Domain + environment
│           │   ├── security.yaml
│           │   └── performance.yaml
│           └── staging/
│               └── testing.yaml
└── applications/
    ├── sharepoint-prod/              # Level 1: Application specific
    │   ├── document-library.yaml
    │   └── site-permissions.yaml
    └── sharepoint-stage/
        └── dev-overrides.yaml
```

### 6.4 Policy File Examples

**Level 5 - Global Policy** (`config/policies/global/authentication.yaml`):
```yaml
id: global-auth
name: Global Authentication Policy
description: Base authentication requirements for all applications

subjects:
  - where: subject.type == 'user'

rules:
  - resource: "*"
    action: "*"
    denyIf: subject.status == 'suspended'
    description: Block suspended users globally
```

**Level 4 - Domain Shared** (`config/policies/domains/sharepoint/shared/document-actions.yaml`):
```yaml
id: sharepoint-document-actions
name: SharePoint Document Actions
description: Common document actions available across all SharePoint environments

subjects:
  - where: subject.type == 'user'

rules:
  - resource: document
    action: view
    allowIf: subject.role IN ['employee', 'contractor', 'manager']
    description: Basic document viewing for all SharePoint environments
    
  - resource: document
    action: edit
    allowIf: subject.role IN ['employee', 'manager']
    description: Document editing for employees and managers
```

**Level 1 - Application Specific** (`config/policies/applications/sharepoint-prod/site-permissions.yaml`):
```yaml
id: sharepoint-prod-site-permissions
name: SharePoint Production Site Permissions
description: Production-specific site access controls

subjects:
  - where: subject.type == 'user'

rules:
  - resource: site
    action: create
    allowIf: 
      all:
        - subject.role == 'site-admin'
        - subject.clearance >= 'confidential'
    description: Only site admins with confidential clearance can create sites in production
    
  - resource: site
    action: delete
    denyIf: true
    description: No site deletion allowed in production
    on_deny:
      obligations:
        - id: log_delete_attempt
          attributes:
            severity: high
            notify: security-team
```

### 6.5 Inheritance Behavior

When processing a request for `sharepoint-prod`, the PDP loads policies in this order:

1. **Application policies** (`sharepoint-prod/`) - Applied first, highest priority
2. **Domain + environment** (`sharepoint/environments/production/`)
3. **Cross-environment** (`sharepoint/cross-environment/`)
4. **Domain shared** (`sharepoint/shared/`)
5. **Global policies** (`global/`) - Lowest priority, fallback

**Key Rules:**
- More specific policies **override** general ones
- If a rule exists at multiple levels, the **most specific** level wins
- Policies are **additive** - you get rules from all applicable levels
- **Deny rules** always override permit rules (deny-override principle)

### 6.6 Performance Benefits

- **Targeted Loading**: Only loads 5-50 relevant policies vs 100+ global policies
- **Request Caching**: 60-second TTL for policy loading results  
- **Registry Caching**: 300-second TTL for application context resolution
- **Latency Reduction**: ~40% improvement (17ms vs 29ms) for uncached requests

### 6.7 Fallback Behavior

- **Missing `pdp_application`**: Falls back to global policy loading
- **Invalid application**: Gracefully degrades to global policies
- **Policy loading errors**: Returns to global resolver with logging
- **Backward compatibility**: Existing global policies continue to work

---

## 7  Audit Checklist

### 7.1 Traditional Policy Auditing
1. **Subject coverage** – are all principal types included?  Use `where:` predicates for dynamic roles.
2. **Rule clarity** – description field explains business intent.
3. **Deny overrides** – ensure any deny rules are intentional (they cancel all permits).
4. **Typo traps** – `conditions` (plural) is unsupported; use `condition`/`when`/sugar. No parentheses in string expressions.
5. **Obligations** – logging / MFA / workflow clearly defined.
6. **Path patterns** – wildcards reviewed for over-breadth.

### 7.2 Application-Scoped Policy Auditing
7. **Hierarchy organization** – policies placed at appropriate inheritance levels.
8. **Application context** – `pdp_application` field usage documented and consistent.
9. **Inheritance conflicts** – more specific policies properly override general ones.
10. **Performance impact** – application-scoped policies achieve expected cache hit rates.
11. **Domain boundaries** – cross-application policy leakage prevented.
12. **Environment separation** – production vs staging policies properly isolated.
13. **Global fallback** – fallback behavior tested when application policies fail.

---

## 8  LLM Assistance
For automated policy explanation or generation, feed the prompt in `docs/llm_prompt.md` to your model.  It encodes syntax rules, deny-override semantics and style guidelines.

---

*End of guide – see cheat-sheet for the auto-generated reference tables.* 
