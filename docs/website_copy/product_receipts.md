# Product — Receipt Vault

## Overview
Receipt Vault produces tamper‑evident, signed receipts for every permitted action. Each receipt captures the decision context and links to the previous receipt, creating an auditable chain per agent.

## What’s recorded
- `policy_snapshot` (constraints) or an identifier/etag for the policy version
- `schema_hash` (tool pin) and `params_hash` (canonical input shape)
- `agent_id`, `call_id`, and timestamps
- Optional `identity_chain` lineage digests (no token bodies)
- `prev_hash` to maintain a cryptographic chain

## Signing and chaining
- Receipts are signed (JWS) by the Vault
- `prev_hash` links each receipt to the prior one for the same agent
- Optional daily anchoring (e.g., via KMS) can be enabled per tenant policy

## Interoperability
- Gateway and BFF emit receipts to the Vault on permit
- Receipts can be exported to analytics/archives without exposing secrets

## Why it matters
- Creates a verifiable audit trail for agent actions
- Reduces ambiguity around “what happened” by snapshotting constraints and inputs
- Supports compliance workflows in regulated environments

CTAs: See receipt schema → View chain example → Read anchoring options
