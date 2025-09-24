## Operations: Approvals in production

This page covers logging, metrics, flags, and SLOs for approvals.

### Logging & tracing

- Workflow logs include events: `approval_interaction_start`, `approvers_resolved`, `approval_completed`, `approval_validation_failed`, etc.
- Include `correlation_id`, `workflow_id`, `node_id`, and resolver type in logs.

### Metrics

- Task counters/histograms (creation, completion, durations)
- Suggested: approval lead time, pending age histogram, refresh updates count

### Flags & env

- `CRS_ENFORCE_CANONICAL_ARNS=true` to require canonical ARNs
- Synonyms managed via `approval_synonyms.yaml`

### Runbooks

- Approver cannot approve (401/403):
  - Check identity normalization (provider/principal ARN) and role membership.
  - Verify resolver selected in `approval_config` and plugin availability.

- Stuck in PENDING:
  - Verify `required_count` and who has approved so far.
  - Check refresh job updated `approval_data` if org changed.

### SLOs

- Target approval latency (P50/P95)
- Error rate for decision handling
- Refresh job success rate

