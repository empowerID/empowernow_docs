# Using EmpowerNow PAT with Dev Tools (Cursor, Claude) and SDKs

## Overview
- Set your tool/SDK base URL to the BFF proxy.
- Paste your EmpowerNow Personal Access Token (PAT) where the vendor API key normally goes.
- The BFF authenticates you, enforces policy/budgets, and calls providers with server-held credentials.

## Proxy base URLs
- OpenAI-compatible: `https://<bff-host>/proxy/openai/v1`
- Anthropic-compatible: `https://<bff-host>/proxy/anthropic/v1`

## Getting a PAT
1. Sign in to the EmpowerNow IdP portal and generate a PAT.
2. Keep the token secure. Example format: `aria_pat_XXXXXXXX_...`

## Cursor (OpenAI interface)
Set in Cursor settings or environment:

```bash
OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

## Claude Code (Anthropic interface)
Set in Claude Code or environment:

```bash
ANTHROPIC_BASE_URL=https://<bff-host>/proxy/anthropic/v1
ANTHROPIC_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

## OpenAI SDK (Python)
```python
from openai import OpenAI
import os

os.environ["OPENAI_BASE_URL"] = "https://<bff-host>/proxy/openai/v1"
os.environ["OPENAI_API_KEY"] = "aria_pat_XXXXXXXXXXXXXXXX"

client = OpenAI()
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp)
```

## OpenAI SDK (Node)
```bash
export OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
export OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```
```ts
import OpenAI from "openai";
const client = new OpenAI();
const resp = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
});
console.log(resp);
```

## Anthropic SDK (Python)
```python
import os
from anthropic import Anthropic

os.environ["ANTHROPIC_BASE_URL"] = "https://<bff-host>/proxy/anthropic/v1"
os.environ["ANTHROPIC_API_KEY"] = "aria_pat_XXXXXXXXXXXXXXXX"

client = Anthropic()
resp = client.messages.create(
    model="claude-3-opus-20240229",
    max_tokens=256,
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp)
```

## Notes
- Do not set vendor org/project headers; the BFF pins them server-side.
- PATs are user-scoped; all actions are attributed to your identity.
- For short-lived sessions, you can also use an ARIA Passport (JWT) as a Bearer token.
- Optional client hints (when supported):
  - `X-Client-Id`: dev tool identity label.
  - `X-Pairwise`: stable pairwise identifier returned by IdP.

### More
- Developer Quickstart: `Developer_Quickstart_PAT_Proxy.md`
- Proxy API Reference: `Proxy_API_Reference.md`
- Troubleshooting: `Troubleshooting_PAT_Proxy.md`
- Tool one-pagers: `docs/tools/`

## Troubleshooting
- 401/403: Verify PAT validity and scoped access.
- 429: Upstream rate limit — retry with backoff.
- Budget errors return structured 402/403 with suggestions.

## Postman-compatible cURL: Issue/List/Revoke a PAT

Replace placeholders before running:
- <idp-host> → idp.ocg.labs.empowernow.ai
- <admin_token> → your IdP admin token (e.g., test_admin_token) or provide a valid session cookie instead

1) Issue a PAT (returns the raw token once)

```bash
curl -sS -X POST "https://<idp-host>/api/idp/oauth/pat" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: <admin_token>" \
  --data '{
    "label": "Cursor Dev",
    "scopes": ["llm:proxy:openai"],
    "ttl_days": 90
  }'
```

2) List PATs for the current user (metadata only)

```bash
curl -sS -X GET "https://<idp-host>/api/idp/oauth/pat" \
  -H "X-Admin-Token: <admin_token>"
```

3) Revoke a PAT by id

```bash
curl -sS -X DELETE "https://<idp-host>/api/idp/oauth/pat/<pat_id>" \
  -H "X-Admin-Token: <admin_token>"
```

Optional: If you prefer cookie auth instead of the admin token, replace the header with your session cookie captured from the IdP UI:

```bash
  -H "Cookie: aria_session=<your_session_cookie>"
```

After issuing a PAT, smoke test the BFF proxy:

```bash
curl -sS -X POST "https://api.ocg.labs.empowernow.ai/proxy/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer aria_pat_XXXXXXXXXXXXXXXX" \
  --data '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```


