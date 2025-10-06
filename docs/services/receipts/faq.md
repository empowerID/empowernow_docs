# FAQ — Receipts

## What counts as a receipt?
A signed record of one high‑value step: actor, plan step, tool, context hashes, policy, and linkage to previous step.

## What if the chain breaks?
Resume with the last valid `self_hash` as `prev_hash`; emit a corrective receipt referencing the gap for audit.

## Can we backfill historical events?
Yes—mark them as backfill; they should not replace anchored heads; maintain chronological `ts` ordering.

## Do we have to anchor every step?
No. Anchor periodically or at plan completion; pick a policy that balances cost and detection latency.

## What happens if a tool schema drifts?
If `schema_hash` differs from the pinned value, deny or require explicit re‑pinning; record the attempted call in a receipt with effect = `Deny`.
