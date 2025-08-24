# Migration Guide — From Global to Application-Scoped Policies

> Canonical reference: `scoped_policy_design.md`. This guide outlines a safe, incremental path to app-scoped policies.

## Goals
- Single external identifier: `resource.properties.pdp_application`
- Preserve deny-override and defaults
- Minimize duplication with inheritance

## Step-by-step plan
1. Create application registry entries (start with `global.yaml`)
2. Move common policies to `domains/<domain>/shared/`
3. Add environment-specific overlays under `domains/<domain>/environments/<env>/`
4. Create per-application directories under `applications/<app_id>/`
5. Add `pdp_application` to client requests; keep existing global policies during transition
6. Enable `USE_APP_SCOPED_POLICIES=true` in non-prod; test with trace endpoints
7. Remove redundant global policies once app-scoped coverage is complete

```mermaid
flowchart LR
  A[Global-only] --> B[Domain shared]
  B --> C[Env overlays]
  C --> D[App-specific]
  D --> E[Enable app-scoped loading]
```

## Authoring tips
- Keep shared policies minimal and safe; prefer explicit app overrides for risky actions
- Use `when` for guarded permits; avoid `allowIf + effect: permit` when intending guards
- Normalize effects to `permit`/`deny` early

## Validation & safety
- Run `scripts/lint_policies.py` before merging
- Use debug trace to confirm inheritance source and load order
- Rollback plan: toggle `USE_APP_SCOPED_POLICIES=false`

## Checklist
## Before/After examples
### Before (global-only)
```yaml
# policies/core/document-access.yaml
id: doc-access
rules:
  - resource: document
    action: read
    effect: permit
    when: "subject.properties.role IN ['employee','manager']"
```

### After (domain + app)
```yaml
# policies/domains/sharepoint/shared/document-actions.yaml
id: sp-doc-actions
rules:
  - resource: document
    action: read
    effect: permit
    when: "subject.properties.role IN ['employee','manager']"

# policies/applications/sharepoint-prod/site-permissions.yaml
id: sp-prod-overrides
rules:
  - resource: document
    action: delete
    effect: deny
    description: No deletion in production
```
- Registry entries created for all target apps
- Directory structure matches inheritance model
- `pdp_application` added to all target client requests
- Trace validation: policies loaded from all five levels as expected
