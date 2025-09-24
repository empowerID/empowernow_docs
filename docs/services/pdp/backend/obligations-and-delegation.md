---
id: obligations-and-delegation
title: Obligations processing and delegation provisioning
description: How the PDP processes obligations via the ProvisionInterceptor and auto-provisions delegations through the Membership Service PIP.
---

This page explains how the PDP handles obligations after policy evaluation and how the ProvisionInterceptor creates or verifies delegations in the Membership Service.

## Where obligations are processed

- After policy evaluation, the PDP runs the ProvisionInterceptor when any obligations are present in the decision result.
- The interceptor scans decision obligations looking for the delegation obligation (`DELEGATION_OBLIGATION_TYPE`).

## Delegation auto‑provisioning

When a delegation obligation is found, the interceptor:

1. Extracts `delegator_id`, `delegate_id`, `jkt` (proof-of-possession key thumbprint), and `capabilities` from the obligation attributes.
2. Calls the DelegationManager, which uses the Membership Service PIP to verify or create the delegation edge.
3. Writes the result into the decision effects, e.g., `effects.delegation = { status, id, ... }`.

## Response normalization for clients

For client simplicity, the PDP normalizes delegation details from effects into `context.attributes.delegation` in the final response payload. Clients should read from `context.attributes.delegation` rather than from `effects`.

### Example obligation payload (policy → PDP)

```json
{
  "id": "delegation",
  "attributes": {
    "delegator_id": "auth:identity:tenant:delegator",
    "delegate_id": "auth:identity:tenant:delegate",
    "jkt": "thumbprint",
    "capability": "identity_chain:act_on_behalf_of",
    "auto_provision": true
  }
}
```

### Decision enrichment (after successful auto‑provision)

```json
{
  "decision": true,
  "context": {
    "attributes": {
      "delegation": {
        "status": "ACTIVE",
        "id": "deleg-123",
        "binding_valid": true,
        "provisioned": true,
        "result_type": "provisioned"
      }
    }
  }
}
```

## Policy requirements

- Policies must emit the delegation obligation (`DELEGATION_OBLIGATION_TYPE`) for flows that require delegation creation/verification (e.g., identity‑chaining).
- The obligation should carry `delegator_id`, `delegate_id`, `jkt`, and `capabilities` as needed for provisioning.

## Relation to IdP obligations

- Delegation provisioning is performed inside the PDP and does not depend on IdP‑side obligations.
- Use the IdP's `evaluate_with_obligations` when you need IdP PEP side‑effects (e.g., audit/workflow/pep_meta). Delegation provisioning remains a PDP concern.

## What to check when debugging

- Ensure the ProvisionInterceptor is initialized by the PDP service.
- Ensure your policy emits the correct delegation obligation for the target action/resource.
- Inspect `context.attributes.delegation` in the PDP response to confirm provisioning and status.


## See also
- Caching behavior, EPS/LKG, and CDC invalidation: `../explanation/performance_caching.md`

## Post‑provisioning cache coherence

After a successful auto‑provision:
- Include the `delegation_id` in the returned decision at `context.attributes.delegation`.
- Evict EPS for the delegator across all applications (subject‑wide) so subsequent EPS loads include the new edge.
- Bypass/evict Graph‑Eval L1 for the current subject/request to avoid reusing a prior deny.
- Emit a CDC event (e.g., `delegation.add` or `delegates_to.created`) so other PDP instances evict EPS.

