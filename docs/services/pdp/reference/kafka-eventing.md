---
title: Kafka & Eventing (PDP)
---

Topics
- `${KAFKA_TOPIC_PREFIX}.decisions` (default `authz.decisions`)
- `${KAFKA_TOPIC_PREFIX}.metrics` (default `authz.metrics`)
- `${KAFKA_TOPIC_PREFIX}.events` (default `authz.events`)
- `${KAFKA_TOPIC_PREFIX}.receipts` (default `authz.receipts`)

Keys & ordering
- Decisions: key `${subject_id}:${resource_id}:${action}` (ordered per key)
- Metrics: metric type
- Events/Receipts: `correlation_id`

```mermaid
flowchart LR
  D[authorization_decision] --> R[decision_receipt]
  D --> M[authorization_metric]
  D -.-> E[event]
```

Event shapes (selected)
- authorization_decision
```
{ "event_type":"authorization_decision", "correlation_id":"uuid", "data": { "decision":true, "subject_id":"user:123", "resource_id":"doc:456", "action":"read", "evaluation_time_ms":10.5 } }
```
- authorization_metric
```
{ "event_type":"authorization_metric", "data": { "metric_type":"authorization_performance", "values": { "evaluation_time_ms":10.5 } } }
```
- decision_receipt
```
{ "event_type":"decision_receipt", "data": { "decision_id":"uuid", "eps_etag":"W/\"...\"", "graph_snapshot_id":null, "policy_refs":["policy:...@rev"], "degraded":false } }
```

Configuration
| Setting | Default | Meaning |
|---------|---------|---------|
| ENABLE_KAFKA_PRODUCER | false | Enable producer |
| KAFKA_BOOTSTRAP_SERVERS | (unset) | Broker list |
| KAFKA_CLIENT_ID | pdp-authz-producer | Client id |
| KAFKA_TOPIC_PREFIX | authz | Namespace |
| KAFKA_LINGER_MS | 10 | Producer linger |
| KAFKA_BATCH_SIZE | 16384 | Batch size |
| KAFKA_COMPRESSION_TYPE | gzip | Compression |

Validation & consumers
- Validate via Kafdrop; correlate by `correlation_id`.
- Analytics can subscribe to decisions/receipts; security to events.

See also
- Settings & flags: `services/pdp/reference/settings-flags.md`


## Inbound CDC and cache invalidation

Certain upstream change events should be consumed to keep PDP caches fresh. When these topics are observed for a subject, evict EPS for that subject across all applications; on revoke/expire, also apply hard‑evict to suppress LKG reuse temporarily.

Topics (examples):
- `delegates_to.created`, `delegates_to.updated`, `delegates_to.revoked`
- `delegation.add`, `delegation.update`, `delegation.revoke`, `delegation.expire`
- `policy_ref.added`, `policy_ref.removed`
- Role/edge changes: `identity.belongs_to*`, `controlled_by*`

Actions:
- Evict: subject‑wide EPS → `eps:{subject_arn}:*`
- On revoke/expire: mark hard‑evict for the subject to disable LKG for a TTL window

See also
- Caching layers and keys: `services/pdp/explanation/performance_caching.md`

### Sequence (example)

```mermaid
sequenceDiagram
  participant Prov as Provisioner/IdP/CRUD
  participant CDC as Topic (delegation.*, policy_ref.*, identity.edges)
  participant PDP as PDP CDC Subscriber
  participant EPS as EPS Cache (L1/L2)
  participant HE as Hard‑Evict

  Prov->>CDC: delegates_to.created / delegation.add
  PDP->>EPS: evict_subject_all_apps(subject_arn)
  Note over EPS: Removes eps:{subject}:* from L1 and L2

  Prov->>CDC: delegation.revoke / delegates_to.revoked
  PDP->>EPS: evict_subject_all_apps(subject_arn)
  PDP->>HE: mark_subject_all_apps(subject_arn)
  Note over HE: Temporarily disables LKG reuse
```

## Event schemas (selected)

### delegation.add

```json
{
  "event_type": "delegation.add",
  "subject": "auth:identity:tenant:delegator",
  "correlation_id": "uuid",
  "data": {
    "delegator_id": "auth:identity:tenant:delegator",
    "delegate_id": "auth:identity:tenant:delegate",
    "capabilities": ["identity_chain:act_on_behalf_of"]
  }
}
```

Consumers: the PDP CDC subscriber evicts EPS for `subject` across all apps; on revoke/expire events it also marks Hard‑Evict to disable LKG.