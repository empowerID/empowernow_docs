## EmpowerNow IdP Consent Testing (PDP Obligations)

### Goal
Enable and verify IdP consent and PDP integration end-to-end using the stack in `CRUDService/docker-compose-authzen4.yml`.

### Prerequisites
- Docker + Docker Compose installed.
- Repos cloned in the same folders as the author’s environment.
- PowerShell 7 on Windows (all commands below assume this).
- Hosts/DNS resolution for `*.ocg.labs.empowernow.ai` or use the localhost alternative noted below.

### What’s already configured
The compose file has been updated under the `idp` service with these keys:
```211:370:CRUDService/docker-compose-authzen4.yml
      CONSENT_ENABLED: "true"
      CONSENT_VERIFICATION_BASE_URL: "https://idp.ocg.labs.empowernow.ai/consent"
      TOKEN_SIGNING_KEY: /run/secrets/idp-signing-key
      IDP_BASE_URL: "https://idp.ocg.labs.empowernow.ai"
      PDP_BASE_URL: "http://pdp:8001"
```
Notes:
- If you prefer pure-local URLs, you may switch:
  - CONSENT_VERIFICATION_BASE_URL → "http://localhost:8002/consent"
  - IDP_BASE_URL → "http://localhost:8002"
- `TOKEN_SIGNING_KEY` points to the same PEM used by `JWT_SIGNING_KEY`.

### Start/Restart the services
- From `C:\source\repos\CRUDService`:
```powershell
docker compose -f docker-compose-authzen4.yml up -d --no-deps idp
```
- Wait for health:
```powershell
docker compose -f docker-compose-authzen4.yml ps idp
docker logs -f idp-app | cat
```
- PDP should already be up via compose. If needed:
```powershell
docker compose -f docker-compose-authzen4.yml up -d --no-deps pdp
docker compose -f docker-compose-authzen4.yml ps pdp
```

### Verify configuration inside the IdP container
```powershell
docker exec idp-app /bin/sh -lc "printenv | egrep '^(CONSENT_ENABLED|CONSENT_VERIFICATION_BASE_URL|TOKEN_SIGNING_KEY|IDP_BASE_URL|PDP_BASE_URL)=' | sort | cat"
```
Expected to see:
- CONSENT_ENABLED=true
- CONSENT_VERIFICATION_BASE_URL=https://idp.ocg.labs.empowernow.ai/consent
- TOKEN_SIGNING_KEY=/run/secrets/idp-signing-key
- IDP_BASE_URL=https://idp.ocg.labs.empowernow.ai
- PDP_BASE_URL=http://pdp:8001

### Quick health checks
- IdP discovery:
```powershell
curl -s http://localhost:8002/api/oidc/.well-known/openid-configuration | jq .issuer
```
Expected: "https://idp.ocg.labs.empowernow.ai/api/oidc" (public) or "http://localhost:8002/api/oidc" (if you switched to localhost).
- PDP health:
```powershell
curl -s http://localhost:8001/health | jq .
```
Expect HTTP 200 and a JSON health payload.

### Automated consent test suite
- From `C:\source\repos\IdP`:
```powershell
$env:PYTHONPATH=(Get-Location).Path
python -m pytest -q `
  src\tests\test_consent_atomic_concurrency.py `
  src\tests\test_consent_get_endpoint.py `
  src\tests\test_consent_polling.py `
  src\tests\test_consent_post_decision.py `
  src\tests\test_consent_receipt.py `
  src\tests\test_consent_stepup_enforcement.py `
  src\tests\test_consent_store.py `
  src\tests\test_consent_subject_manager_policy.py `
  src\tests\test_detect_consent_obligation.py `
  src\tests\test_token_exchange_consent_pending.py `
  src\tests\test_token_exchange_consent_retry_jkt.py `
  src\tests\test_token_exchange_consent_retry.py
```
- All tests should pass. These cover:
  - Pending consent handle creation
  - Polling behavior
  - Decision posting and state transition
  - Receipt emission
  - Step-up enforcement
  - Retry flows

### Optional manual smoke
- Get a token (client credentials) to confirm OIDC is live:
```powershell
curl -s -X POST http://localhost:8002/api/oidc/token `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -d "grant_type=client_credentials&client_id=service-client&client_secret=secret1&scope=openid" | jq .
```
- If policies are configured to require consent for a certain exchange flow, initiate that flow and verify:
  - A pending consent handle is returned.
  - Polling returns `authorization_pending` until you approve/deny.
  - The consent link format matches CONSENT_VERIFICATION_BASE_URL.

### Acceptance criteria
- IdP healthcheck and OIDC discovery return 200.
- Environment/config show:
  - CONSENT_ENABLED=true
  - CONSENT_VERIFICATION_BASE_URL set and reachable
  - TOKEN_SIGNING_KEY resolves to a valid PEM
  - PDP_BASE_URL points to running PDP and policy checks succeed
- All consent-related pytest tests pass.
- Logs show consent obligations detected and transitions processed.

### Troubleshooting
- 401/audience issues: ensure requested audience matches `.../api/v1` or documented audiences.
- Service-to-service calls: inside Docker use `http://pdp:8001`, `http://idp:8002`. External (browser) hits should use HTTPS public domains.
- Verification URLs: if you see domain mismatches in verification links, align `IDP_BASE_URL` and `CONSENT_VERIFICATION_BASE_URL` (use either both public or both localhost).
- If env changes aren’t reflected, restart IdP:
```powershell
docker compose -f docker-compose-authzen4.yml up -d --no-deps idp
```

- I updated the compose and verified the env vars in `idp-app`. You can hand this guide off to an evaluator to run through the steps and confirm everything end-to-end.