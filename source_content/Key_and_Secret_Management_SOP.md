# Key & Secret Management SOP

## Scope
- Vendor API keys (OpenAI/Anthropic) in BFF
- IdP client secrets for introspection

## Storage
- Prefer secret pointers (Docker secrets, Vault, or file:primary: pointers)
- Rotate on a schedule; keep old keys briefly for rollback

## Rotation Steps
1. Provision new vendor key; load into secret store
2. Update BFF secret pointer; reload/restart
3. Verify health and test proxy calls
4. Remove old key; monitor error rates

## Rollback
- Re-point secret pointer to prior key; restart BFF; verify

## Validation
- Synthetic tests for each provider path and streaming

## References
- `docker-compose-authzen4.yml` BFF secrets
