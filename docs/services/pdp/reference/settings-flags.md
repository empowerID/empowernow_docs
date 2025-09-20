---
title: PDP Settings and Flags Reference
---

Use this page as the canonical source for PDP runtime settings and feature flags. Headings act as deep-link anchors for use from how‑tos and website pages.

## Contents
- [Core runtime](#core-runtime)
- [AuthZEN API](#authzen-api)
- [Policy loading](#policy-loading)
- [Membership PIP](#membership-pip)
- [Caching and performance](#caching-and-performance)
- [Evaluation behavior](#evaluation-behavior)
- [Security and integrity](#security-and-integrity)
- [Observability](#observability)

## Core runtime

| Setting | Env var | Notes |
|---|---|---|
| Environment | PDP_ENVIRONMENT | Affects logging and defaults |
| Host/Port | PDP_HOST, PDP_PORT | Bind address/port |

## AuthZEN API

| Setting | Env var | Notes |
|---|---|---|
| Base URL (for BFF) | PDP_PUBLIC_BASE_URL | External base, if advertised |
| Endpoints | — | See `explanation/rest_api_contract.md` |

## Policy loading

| Setting | Env var | Notes |
|---|---|---|
| Policy directory | PDP_POLICY_DIR | On-disk policy source |
| Reload on change | PDP_POLICY_RELOAD | Dev‑mode only |
| Scoped application key | PDP_APPLICATION_KEY | e.g., `resource.properties.pdp_application` |

## Membership PIP

| Setting | Env var | Notes |
|---|---|---|
| Membership base URL | MEMBERSHIP_BASE_URL | PIP read surface |
| Timeout (ms) | MEMBERSHIP_TIMEOUT_MS | Client timeout |
| Cache TTL (ms) | MEMBERSHIP_CACHE_TTL_MS | Local PIP cache |

## Caching and performance

| Setting | Env var | Notes |
|---|---|---|
| Decision cache enabled | PDP_DECISION_CACHE_ENABLED | Toggle L1 cache |
| Decision cache TTL (ms) | PDP_DECISION_CACHE_TTL_MS | Default TTL for decisions |
| Negative cache TTL (ms) | PDP_NEGATIVE_CACHE_TTL_MS | TTL for deny decisions |

## Evaluation behavior

| Setting | Env var | Notes |
|---|---|---|
| Most‑restrictive merge | PDP_MERGE_STRICT | Intersection/minimum behavior for constraints |
| Default app scope | PDP_DEFAULT_APPLICATION | Fallback app key if missing |
| Failure policy | PDP_FAILURE_POLICY | fail_closed or fail_open |

## Security and integrity

| Setting | Env var | Notes |
|---|---|---|
| Require schema hash | PDP_REQUIRE_SCHEMA_HASH | Enforce tool pins on incoming context |
| Receipt obligation default | PDP_EMIT_RECEIPT_DEFAULT | Emit receipt when absent |
| JWT signing (receipts) | PDP_JWT_SIGNING_KEY | Path to key if PDP signs artifacts |

## Observability

| Setting | Env var | Notes |
|---|---|---|
| Log level | PDP_LOG_LEVEL | info/debug/warn/error |
| Tracing enabled | PDP_TRACING_ENABLED | Expose OTEL spans |

---

### Anchor index
<span id="env-PDP_ENVIRONMENT"></span>
<span id="env-PDP_HOST"></span>
<span id="env-PDP_PORT"></span>
<span id="env-PDP_PUBLIC_BASE_URL"></span>
<span id="env-PDP_POLICY_DIR"></span>
<span id="env-PDP_POLICY_RELOAD"></span>
<span id="env-PDP_APPLICATION_KEY"></span>
<span id="env-MEMBERSHIP_BASE_URL"></span>
<span id="env-MEMBERSHIP_TIMEOUT_MS"></span>
<span id="env-MEMBERSHIP_CACHE_TTL_MS"></span>
<span id="env-PDP_DECISION_CACHE_ENABLED"></span>
<span id="env-PDP_DECISION_CACHE_TTL_MS"></span>
<span id="env-PDP_NEGATIVE_CACHE_TTL_MS"></span>
<span id="env-PDP_MERGE_STRICT"></span>
<span id="env-PDP_DEFAULT_APPLICATION"></span>
<span id="env-PDP_FAILURE_POLICY"></span>
<span id="env-PDP_REQUIRE_SCHEMA_HASH"></span>
<span id="env-PDP_EMIT_RECEIPT_DEFAULT"></span>
<span id="env-PDP_JWT_SIGNING_KEY"></span>
<span id="env-PDP_LOG_LEVEL"></span>
<span id="env-PDP_TRACING_ENABLED"></span>

---

Notes
- Keep flags minimal in how‑tos; link to this page for authoritative definitions.
- For budgets semantics and 402 mapping, see `./effective-budgets.md`.
