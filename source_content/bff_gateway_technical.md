### BFF Gateway Authorization and Kafka Business Logging – Technical Guide

This document provides detailed, production-focused guidance for configuring, operating, and validating the BFF’s gateway authorization (PDP) and Kafka business logging. It is written for DevOps, Security Administrators, and QA.

---

## 1) Overview

- Purpose: Centralize policy enforcement at the BFF layer for all routed APIs, with rich business context and auditable decisions.
- Key capabilities
  - Route-level authorization via `authz: pdp` in `routes.yaml`.
  - Request-to-policy mapping via `endpoint_map` in `pdp.yaml` (supports JSONPath and path params).
  - Fail-secure enforcement (errors → deny), with structured Kafka audit events and Prometheus metrics.
  - SSE-aware checks before opening streams.
  - Global toggle to enable/disable BFF authz enforcement.

---

## 2) Configuration surfaces

### 2.1 Global toggle

- File: `ms_bff_spike/ms_bff/src/core/config.py`
- Setting: `settings.authz_enabled` (default `True`)
- Env override: `MS_BFF_AUTHZ_ENABLED=false` to disable checks globally (useful during migration or emergency).

Example (YAML settings):
```yaml
feature_flags:
  authz_enabled: true
```

### 2.2 Route-level enablement

- File: `ServiceConfigs/BFF/config/routes.yaml`
- Add `authz: pdp` to any route that must be authorized at the BFF.

Example:
```yaml
- id: "crud-execute"
  path: "/api/crud/execute"
  target_service: "crud_service"
  upstream_path: "/execute"
  methods: ["POST"]
  auth: "session"
  authz: "pdp"
```

### 2.3 Request mapping to PDP inputs

- File: `ServiceConfigs/BFF/config/pdp.yaml`
- Section: `endpoint_map`
  - Keys are request paths (exact) or templated (e.g., `/api/workflows/{workflow_id}/start`).
  - Methods under each key map to `resource`, `action`, and `props` extracted from body/path.
  - JSONPath-style lookups supported: `$.a.b.c`.

Examples:
```yaml
endpoint_map:
  /api/crud/execute:
    POST:
      resource: "crud:command"
      action: "execute"
      props:
        system: "$.system"
        object_type: "$.object_type"
        command: "$.action"
        id: "$.params.id"

  /api/workflows/{workflow_id}/start:
    POST:
      resource: "workflow"
      action: "execute"
      props:
        workflow_id: "{workflow_id}"
```

Behavior when no mapping is found:
- Authorization is denied with a structured audit log (decision=`NoMapping`). This is fail-secure by default.

---

## 3) Enforcement flow

### 3.1 Standard HTTP routes (with classifier-first and PDP obligations)

```mermaid
sequenceDiagram
  participant Client
  participant Traefik
  participant BFF
  participant Classifier
  participant PDP
  participant Oblig as Obligations
  participant CRUD as Orchestration Service
  participant Backend as Backend Service

  Client->>Traefik: HTTP /api/... (session/bearer)
  Traefik->>BFF: Route
  BFF->>BFF: Authenticate
  BFF->>BFF: Resolve mapping
  BFF->>Classifier: Classify (optional per endpoint)
  Classifier-->>BFF: label/confidence/mode
  BFF->>PDP: Evaluate with category_* in context
  PDP-->>BFF: decision + constraints + obligations
  alt Deny / NoMapping / Error
    BFF-->>Client: 403
  else Allow
    BFF->>Oblig: Process obligations
    Oblig->>CRUD: POST /workflow/start (if run_workflow)
    Note right of Oblig: Best-effort unless required=true
    BFF->>Backend: Proxy with constraints
    Backend-->>BFF: Response
    BFF-->>Client: 200 (+ x-crud-workflow-id)
  end
```

### 3.2 SSE/Streaming routes

- Same as standard, but the PDP check runs before opening the stream. On deny, the stream is not opened and a 403 is returned.

---

## 3.3 Budget enforcement modes (PDP)

- Controlled by `PDP_BUDGET_MODE` in PDP settings:
  - `enforce` (default): deny on budget exhaustion/insufficient remaining; return `spend_snapshot` in decision context.
  - `advisory`: do not deny on budget; still attach `spend_snapshot` for observability/UX.
  - `off`: skip BudgetState PIP entirely.
- Category-pending semantics: when `category_pending=true`, PDP skips category-scoped pools (or evaluates an `uncategorized` pool if configured). Overall/provider/model pools still apply.

---

## 4) Structured business logging (Kafka)

### 4.1 Event: AUTHZ_DECISION

Emitted for every protected route (`authz: pdp`) with decision context.

Core fields (typical):
- `event`: `AUTHZ_DECISION`
- `decision`: `Allow` | `Deny` | `NoMapping`
- `resource`, `action`, `resource_id` (if derived)
- `props`: flattened subset of authorization context (safe keys)
- `route_id`, `path`, `method`, `target_service`
- `user_id`, `principal_arn`, `actor_arn` (when available)
- `correlation_id`, `session_id` (if available)
- `latency_ms` (PDP time)
- `reason`: short text for deny/no mapping/errors

Enablement:
- `init_enterprise_logging()` in startup wiring routes structured logs to Kafka when Kafka is enabled.
- Kafka settings in `settings`:
  - `kafka.enabled`, `kafka.bootstrap_servers`, `kafka.topic_prefix` or service-level `kafka.audit_topic`.

### 4.2 Topics

- Default pattern: `bff.audit` or `empowernow.bff.audit` (depending on your Kafka config module).
- Align with your enterprise Kafka topic conventions; the logger will use configured topic names.

New obligation-driven publishing:
- `audit_log` obligation triggers a best-effort publish to the audit topic with enriched payload (decision_id, subject_arn, model, correlation_id). If `required=true`, errors propagate.

---

## 5) Prometheus metrics and dashboards

Metrics emitted (non-exhaustive):
- `bff_authz_requests_total{resource,action,decision}`
- `bff_authz_latency_seconds_bucket{resource,...}` (histogram)
- `service_requests_total{service="pdp"}` and `service_errors_total{service="pdp",error_type=...}`
- `bff_llm_category_export_total{exported,mode}` (classifier-first export gate outcomes)
- `bff_llm_category_reuse_total{source}` (strict guard reuse of precomputed category)

Provided assets:
- Dashboard: `observability/grafana/dashboard_bff_authz.json`
- Alerts: `observability/grafana/alerts_bff_authz.yaml`

Key visuals:
- Deny rate (5m): `sum(rate(bff_authz_requests_total{decision="Deny"}[5m])) / sum(rate(bff_authz_requests_total[5m]))`
- Decision volume by decision/resource
- PDP error rate and latency
- AuthZ P95 latency by resource

Alerts include:
- High deny rate, PDP errors spike, NoMapping anomalies

---

## 6) DevOps: deployment and operations

### 6.1 Minimal steps to enable BFF authorization
1) Mark protected routes with `authz: pdp` in `ServiceConfigs/BFF/config/routes.yaml`.
2) Define mappings in `ServiceConfigs/BFF/config/pdp.yaml` under `endpoint_map` for those routes.
3) Ensure `MS_BFF_AUTHZ_ENABLED=true` (default is true).
4) Verify PDP service reachability and credentials (`settings.pdp.*`).
5) Deploy; monitor metrics and Kafka events.

### 6.2 Migration from CRUDService authorization
1) Ensure BFF routes covering CRUD endpoints have `authz: pdp` and proper `endpoint_map` entries.
2) Disable CRUDService-side authorization (e.g., set `enable_authorization: false` in `ServiceConfigs/CRUDService/config/pdp.yaml` or equivalent flag). Confirm exact setting name in that service’s config.
3) Roll out BFF changes first in staging; validate allow/deny parity.
4) Enable Kafka and import Grafana dashboard; verify AUTHZ_DECISION stream.
5) Cut over traffic; keep an eye on deny rates and PDP error rates.

### 6.5 Enabling obligations
- Ensure PDP policies attach `audit_log` and/or `run_workflow` in `on_permit` where needed.
- BFF requires CRUD base url and Kafka producer configured; `x-correlation-id`, `X-Principal-ARN`, `X-Actor-ARN` are forwarded.

### 6.3 Rollback plan
- Flip `MS_BFF_AUTHZ_ENABLED=false` to bypass BFF checks temporarily.
- Re-enable CRUDService authorization if needed while investigating.

### 6.4 Tuning
- PDP cache TTL: `settings.pdp.cache_ttl`.
- Retry/circuit-breaker at HTTP client level for PDP.
- Metrics-based SLOs: AuthZ latency and PDP error rate.

---

## 7) Security administrators: policy mapping and validation

### 7.1 Resource/action mapping
- Use `endpoint_map` to translate API shape to policy inputs.
- Prefer stable resource kinds: e.g., `crud:command`, `workflow`.
- Include key props: `system`, `object_type`, `command`, `id`, `workflow_id`.
- Use path params via `{param}` and request body via JSONPath `$.field.nested`.

### 7.2 Validation workflow
1) For a given API, confirm a mapping exists (grep `endpoint_map`).
2) Exercise an allow case; verify `decision=Allow` in Kafka and `bff_authz_requests_total{decision="Allow"}` increments.
3) Exercise a deny case; verify `decision=Deny` with `reason` populated.
4) Remove mapping temporarily to confirm `decision=NoMapping` events are visible (optional test-only).

### 7.3 Audit readiness
- Kafka payloads contain principal identifiers (user_id, ARNs where available), route_id, resource/action, and props—sufficient for forensics.
- Correlate via `correlation_id` end-to-end.

---

## 8) QA: test plans

### 8.1 Unit/integration tests (in-repo)
- Unit tests cover parsing (`authz` in routes loader) and resolver mapping.
- Router integration tests cover allow/deny, toggle-off bypass, SSE pre-check.

### 8.2 Manual verification checklist
- Allow case: valid subject, policy grants → 200 from backend, Kafka `Allow` event.
- Deny case: subject lacks permission → 403 from BFF, Kafka `Deny` event.
- No mapping: remove route mapping → 403, Kafka `NoMapping` (staging only).
- SSE route: pre-check denies stream opening when unauthorized.
- Toggle-off: set `MS_BFF_AUTHZ_ENABLED=false` → traffic proxies without PDP calls.

### 8.3 Negative paths
- PDP unavailable/timeouts: verify fail-secure deny and `service_errors_total{service="pdp"}` increments.
- Malformed bodies: resolver handles gracefully; if required props missing, deny with reason.

---

## 9) Code touchpoints

- Route loader: accepts `authz` field and validates it.
- Dynamic router: performs PDP pre-check for `authz: pdp`, including SSE.
- AuthZ resolver: derives `resource/action/props` via `endpoint_map` (JSONPath/path params).
- Policy client: invokes PDP and records latency/decision metrics.
- Logging: emits `AUTHZ_DECISION` with business context; Kafka configuration controlled via settings.

Key files:
- `ms_bff_spike/ms_bff/src/routing/yaml_loader.py`
- `ms_bff_spike/ms_bff/src/routing/dynamic_router.py`
- `ms_bff_spike/ms_bff/src/services/authz_resolver.py`
- `ServiceConfigs/BFF/config/routes.yaml`
- `ServiceConfigs/BFF/config/pdp.yaml`
- `ms_bff_spike/ms_bff/src/core/config.py`
- `ms_bff_spike/observability/grafana/dashboard_bff_authz.json`
- `ms_bff_spike/observability/grafana/alerts_bff_authz.yaml`

---

## 10) Known scope and non-goals

- Edge security (WAF/bot detection, global anycast/CDN) handled by Traefik or edge providers.
- Non-HTTP protocols are out of scope.
- Policy definitions reside in the central PDP, not in the BFF.

---

## 11) Quickstart examples

### Protect a new route
1) Add to `routes.yaml`:
```yaml
- id: "orders-exec"
  path: "/api/orders/execute"
  target_service: "orders_service"
  upstream_path: "/execute"
  methods: ["POST"]
  auth: "session"
  authz: "pdp"
```
2) Map in `pdp.yaml`:
```yaml
endpoint_map:
  /api/orders/execute:
    POST:
      resource: "orders:command"
      action: "execute"
      props:
        command: "$.action"
        order_id: "$.params.id"
```
3) Deploy and verify: 200 on allow, 403 on deny; Kafka `AUTHZ_DECISION` and Prometheus metrics update.

### Add obligations to a policy
```yaml
rules:
  - id: route-allow
    resource: "api:orders"
    action: "create"
    allowIf: "true"
    on_permit:
      obligations:
        - id: audit_log
          attributes:
            event: "orders.create.allow"
            payload:
              decision_id: "{{context.decision_id}}"
              subject: "{{subject.id}}"
        - id: run_workflow
          attributes:
            workflow_name: "orders_post_create"
            data:
              order_id: "{{resource.attributes.id}}"
              actor: "{{subject.id}}"
```

---

For questions or escalation paths, include this doc in change tickets and link the dashboard and alert rules to your monitoring runbooks.


