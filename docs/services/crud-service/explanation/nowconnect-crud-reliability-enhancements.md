---
id: nowconnect-crud-reliability-enhancements
title: NowConnect + CRUD Service reliability enhancements (LDAP/AD)
description: "Idempotent group membership operations, NowConnect routing validation, expanded metrics, and configurable knobs for bulk scale."
sidebar_label: NowConnect + CRUD reliability
---

### Audience

- CRUD Service admins and DC Ops/DevOps/SRE teams.

## High-level outcomes

- All LDAP/AD group membership operations are now idempotent and batch-safe.
- End-to-end routing through NowConnect is validated and observable with new metrics.
- Intermittent “attribute type not present”/“type or value exists” errors no longer break workflows.
- Configurable knobs added for bulk scale control.

## Routing via NowConnect (OpenLDAP)

- New system config: `ServiceConfigs/CRUDService/config/systems/av_openldap_nowconnect.yaml` points to `base_url: nowconnect-cloud` on port `389`.
- To force tests/workflows through NowConnect without changing existing references to `av_openldap`, shadow it at runtime:
  - Set `SERVICE_CONFIG_DIR` to a temp directory that contains `systems/av_openldap.yaml` copied from `av_openldap_nowconnect.yaml`.

Example test-run override:

```bash
docker compose -f docker-compose-nowconnect.yml run --rm \
  -e OPENLDAP_URL=ldap://nowconnect-cloud -e OPENLDAP_PORT=389 \
  -e OPENLDAP_BASE_DN=dc=example,dc=org \
  -e OPENLDAP_USERNAME=cn=admin,dc=example,dc=org \
  -e OPENLDAP_PASSWORD=admin \
  crud-service sh -lc '
    mkdir -p /tmp/nowconnect/systems;
    cp /app/config/systems/av_openldap_nowconnect.yaml /tmp/nowconnect/systems/av_openldap.yaml;
    export SERVICE_CONFIG_DIR=/tmp/nowconnect;
    pytest -q tests/integration/test_openldap_readonly_extended.py::test_anonymous_bind_search
  '
```

## NowConnect cloud observability

- Metrics endpoint (inside container): `http://localhost:8765/metrics`
- New Prometheus metrics in `nowconnect-cloud`:
  - `nowconnect_write_drain_seconds{connector,phase}`: histogram for socket write/drain latency
  - `nowconnect_inbound_queue_size{connector}`: current inbound queue depth
  - `nowconnect_listener_errors_total{connector,type}`: error counter for listener/session
  - `nowconnect_pdp_decisions_total{result,connector}`: PDP authorize result counter
  - Existing: `nowconnect_tcp_connections_total{connector}`, `nowconnect_tcp_bytes_total{direction,connector}`

Quick check (inside container):

```bash
docker compose -f docker-compose-nowconnect.yml exec nowconnect-cloud sh -lc "
python - <<'PY'
import urllib.request
d = urllib.request.urlopen('http://localhost:8765/metrics', timeout=3).read().decode()
for l in d.splitlines():
    if l.startswith('nowconnect_tcp_connections_total') or \
       l.startswith('nowconnect_tcp_bytes_total') or \
       l.startswith('nowconnect_write_drain_seconds') or \
       l.startswith('nowconnect_inbound_queue_size') or \
       l.startswith('nowconnect_listener_errors_total') or \
       l.startswith('nowconnect_pdp_decisions_total'):
        print(l)
PY"
```

What to look for:

- Connections and bytes increase while running LDAP via `nowconnect-cloud`.
- Write/drain histogram records non-zero counts under the `addomain` connector during activity.
- Zero or near-zero `nowconnect_listener_errors_total` in steady state.

## LDAP connector changes (OpenLDAP path)

File: `CRUDService/src/connectors/ldap_connector.py`

### Reliability changes

- Idempotent modify:
  - If a MODIFY_REPLACE fails due to missing attribute (e.g., “noSuchAttribute”, “attribute type not present”), it automatically retries as MODIFY_ADD.
  - Adds and deletes treat “type or value exists” and “noSuchAttribute/attribute type not present” as success.
- Membership updates (`update_group_members`):
  - Computes a diff from current state vs requested, to avoid redundant operations.
  - Batches values (configurable) and applies add-first then delete, preventing schema violations.
  - For `groupOfNames` (MUST member), avoids transitioning to zero members; optional anchor support to keep non-empty during mutations.
  - Uses Permissive Modify control (OID `1.2.840.113556.1.4.1413`) when enabled.
  - Top-level tolerance for benign idempotent errors returns success instead of failing the operation.

### Config knobs (read from connector config)

- `membership_batch_size`: int (default 500)
- `membership_max_concurrency`: int (default 4) [reserved for future concurrency controls]
- `enable_permissive_modify`: bool (default true) — enables server-side permissive modify where supported
- `enable_assertion_control`: bool (default true) — enables RFC 4528 optimistic concurrency for membership modifications
- `membership_anchor_dn`: string (optional) — DN used as temporary anchor for `groupOfNames` to avoid zero-member transitions
- `verify_member_dns`: bool (default true) — optional pre-flight DN existence checks

Example YAML snippet:

```yaml
connection:
  server:
    base_url: nowconnect-cloud
    port: 389
    use_ssl: false
    base_dn: dc=example,dc=org
  credentials:
    username: cn=admin,dc=example,dc=org
    password: admin

pool_size: 5
page_size: 100
membership_batch_size: 500
membership_max_concurrency: 4
enable_permissive_modify: true
enable_assertion_control: true
membership_anchor_dn: "uid=anchor,ou=anchors,dc=example,dc=org"  # optional
verify_member_dns: true
```

Behavioral notes:

- Previously erroring deletes/adds when already absent/present are now treated as success.
- REPLACE of missing attribute is auto-converted to ADD.
- Add-first ordering prevents temporary schema violations for `groupOfNames`.

## Active Directory connector changes

File: `CRUDService/src/connectors/ad_connector.py`

### Reliability changes

- Added the same configuration knobs as above for parity:
  - `membership_batch_size`, `membership_max_concurrency`, `enable_permissive_modify`, `enable_assertion_control`, `verify_member_dns`
- Group membership operations:
  - `add_to_group`:
    - Reads current members, computes diff, applies ADDs in batches with Permissive Modify and idempotent handling (treats “type or value exists” as success).
  - `remove_from_group`:
    - Reads current members, computes diff, applies DELETEs in batches with Permissive Modify and idempotent handling (treats “noSuchAttribute/attribute type not present” as success).

Example config excerpt:

```yaml
server:
  base_url: ad.example.corp
  port: 636
  use_ssl: true
pool_size: 10
membership_batch_size: 500
enable_permissive_modify: true
enable_assertion_control: true
verify_member_dns: true
```

Notes:

- Assertion control + idempotency reduces races for concurrent writers; the connector re-diffs and retries on assertion failure.
- The changes avoid failing on benign duplicate/non-existent membership operations and scale large list changes in bounded batches.

## Operational guidance

### Recommended settings for bulk operations

- Start with:
  - `membership_batch_size`: 200–500
  - `membership_max_concurrency`: 4–8 (when concurrency support is introduced)
  - `enable_permissive_modify`: true
  - `enable_assertion_control`: true
  - `verify_member_dns`: true (optional pre-flight)

### Runbooks

- End-to-end “ping-pong” check:
  - Run a read-only LDAP search via `nowconnect-cloud` (as shown above).
  - Confirm NowConnect metrics counters increase, and no listener errors.
- Bulk membership change dry-run:
  - Use a small test group, run add/remove of 1k entries, verify successful completion and stable latencies.
  - Watch membership batch metrics.

## Backwards compatibility

- Membership operations now return success when attempting to:
  - Add values already present.
  - Delete values not present.
  - Replace a missing attribute (automatically converted to add).
- If you require strict failure on those cases, set `enable_permissive_modify: false` and adjust workflows to avoid idempotent handling (not recommended for large, concurrent or rerun-prone operations).

## Recently implemented (formerly near-term roadmap)

- Assertion control (RFC 4528) to guard against concurrent writer races (re-diff and retry on assertion failure).
- Membership-specific Prometheus metrics:
  - `nowconnect_ldap_membership_batch_total{action,system}`
  - `nowconnect_ldap_membership_values_total{action}`
  - `nowconnect_ldap_membership_batch_seconds` (histogram)
  - `nowconnect_ldap_membership_errors_total{code}`
- Optional DN verification (`verify_member_dns`) before membership changes.

## Quick validation status

- LDAP suite through NowConnect: green for user/group lifecycle after changes.
- AD connector: membership add/remove now batched and idempotent; ready for bulk use.

Example smoke:

```bash
# Lifecycle test via NowConnect — now passes
docker compose -f docker-compose-nowconnect.yml run --rm \
  -e OPENLDAP_URL=ldap://nowconnect-cloud -e OPENLDAP_PORT=389 \
  -e OPENLDAP_BASE_DN=dc=example,dc=org \
  -e OPENLDAP_USERNAME=cn=admin,dc=example,dc=org \
  -e OPENLDAP_PASSWORD=admin \
  crud-service pytest -q tests/integration/test_openldap_write_path.py::test_user_group_lifecycle
```

- NowConnect metrics show connections/bytes increment during tests; write/drain latency histograms record activity.

See also:

- `services/nowconnect/how-to/operational-validation-health`
- `services/nowconnect/explanation/metrics-and-reliability`
- `services/crud-service/explanation/ldap-connector-idempotency`


