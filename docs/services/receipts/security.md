# Security — Keys, Anchors, and Verification

## Key management
- PEP keys in HSM/KMS; rotate regularly; publish JWKS with kid/version
- Sign with ES256/EdDSA; validate clock skew windows

## Anti‑replay
- Unique `id` per step; include `plan.step` in signed payload
- Reject duplicates and non‑monotonic `ts` per plan

## Anchoring cadence
- Anchor every N steps or plan completion; verify heads periodically
- Keep an audit log of head changes (append‑only)

## Integrity verification
- Recompute self hashes from raw receipt JSON
- Verify JWS per step; verify chain head equals anchored head

See also: API and Storage.
