# Application Boundary Enforcement — Prevent Cross-App Leakage

> Canonical reference: `scoped_policy_design.md`. This doc explains how we enforce application boundaries during policy authoring and loading.

## Responsibilities
- Validate resources/actions belong to the application schema
- Detect suspicious cross-application references in expressions
- Produce actionable errors/warnings for authors

## Components & relations
```mermaid
classDiagram
  class ApplicationBoundaryEnforcer {
    +validate_policy_boundaries(policy, app_id) : ValidationResult
    -_validate_rule_boundaries(rule, app_id, schema) : List[str]
    -_validate_expression_boundaries(policy, app_id) : List[str]
  }
  class ValidationResult {
    +valid: bool
    +errors: string[]
    +warnings: string[]
  }
  class ApplicationRegistry {
    +load_application_schema(app_id) : ApplicationSchema
  }
  class ApplicationSchema {
    +resource_types: string[]
    +actions: string[]
  }

  ApplicationBoundaryEnforcer --> ApplicationRegistry
  ApplicationBoundaryEnforcer --> ValidationResult
  ApplicationRegistry --> ApplicationSchema
```

## Validation flow
```mermaid
flowchart LR
  A[Policy YAML] --> B[Load for app_id]
  B --> C[BoundaryEnforcer.validate]
  C --> D{Resources in schema?}
  D -- no --> E[Error: unknown resource]
  D -- yes --> F{Actions in schema?}
  F -- no --> G[Error: unknown action]
  F -- yes --> H[Scan expressions for cross-app refs]
  H --> I{Suspicious pattern?}
  I -- yes --> J[Error/Warning with location]
  I -- no --> K[ValidationResult: valid]
```

## Best practices for authors
- Keep application schemas accurate and minimal
- Avoid hardcoding IDs from other applications in expressions
- Prefer `MATCHES` with path attributes over ad-hoc path checks

## Typical validation errors (and how to fix)
- Resource not in schema:
  - Error: `Resource 'hr_salary_data' not defined in application 'sharepoint-prod'`
  - Fix: add to app schema if legitimate, or move rule to correct application.
- Action not in schema:
  - Error: `Action 'purge' not defined in application 'sharepoint-prod'`
  - Fix: add action to schema or rename to an allowed action.
- Suspicious cross-app reference:
  - Error: `Expression may contain cross-application reference: 'resource.properties.hr_ssn ...'`
  - Fix: remove cross-app attribute or route through an approved PIP that exposes allowed data.
