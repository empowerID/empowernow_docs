# Authorization & Policy Reference

## Resources
- `llm:proxy:openai`
- `llm:proxy:anthropic`

## Inputs to PDP
- Subject: resolved user ARN from PAT introspection
- Action: `invoke`
- Resource attributes: provider, model (normalized), project/org (pinned), agent_id

## Example policy (conceptual)
- Allow invoke for group X during business hours within budget Y

## Outage Policy (LKG)
- BFF caches last-known-allow for specific tuples; time-bound and auditable

## References
- `ms_bff_spike/ms_bff/src/services/policy_client.py`
- `ms_bff_spike/ms_bff/src/services/outage_policy.py`
