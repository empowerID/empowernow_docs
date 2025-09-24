# Developer Quickstart: Use EmpowerNow PATs via the BFF OpenAI/Anthropic Proxy

## What you get
- Single API base for OpenAI and Anthropic through the BFF
- Personal Access Token (PAT) from the IdP instead of vendor keys
- Built-in authN/Z (IdP + PDP), budgeting, logging, and streaming passthrough

## 1) Get your PAT
1. Open the IdP Admin UI → PATs.
2. Click “New PAT”, name it, set lifetime if applicable.
3. Copy the token once and store securely. Example: `aria_pat_XXXXXXXXXXXXXXXX`.

## 2) Set your tool/SDK base URL and token
Replace `<bff-host>` with `api.ocg.labs.empowernow.ai` (or your environment host).

```mermaid
sequenceDiagram
  participant Tool
  participant BFF
  participant IdP
  Tool->>BFF: Call using PAT in vendor header
  BFF->>IdP: Introspect PAT
  IdP-->>BFF: Subject (ARN), pairwise, scopes
  BFF-->>Tool: Response (policy/budget enforced)
```

### Cursor (OpenAI-compatible)
```bash
OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

### Claude Code (Anthropic-compatible)
```bash
ANTHROPIC_BASE_URL=https://<bff-host>/proxy/anthropic/v1
ANTHROPIC_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

### OpenAI SDK (Python)
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

### OpenAI SDK (Node)
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

### Anthropic SDK (Python)
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

## 3) Streaming
The proxy preserves provider streaming semantics (SSE/chunked). Tools and SDKs stream normally.

## 4) Model name aliases
The BFF normalizes model aliases. Use your preferred alias; the BFF maps to the canonical provider model where configured.

## 5) Common errors
- 401/403: Invalid PAT or policy denial; verify token and permissions.
- 429: Rate limit (upstream or introspection). Retry with backoff.
- 5xx: Provider or network issue; check status page/observability dashboards.

## 6) Notes
- Do not set vendor org/project headers; BFF pins them server-side.
- Optional hints: `X-Client-Id` and `X-Pairwise` to help analytics and pairwise tracking.

## See also
- Using dev tools with PATs: `Using_PAT_with_DevTools.md`
- Proxy API reference: `Proxy_API_Reference.md`

---

## Postman-friendly cURL
OpenAI-compatible chat completions:
```bash
curl -sS \
  -H 'Authorization: Bearer aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}' \
  https://<bff-host>/proxy/openai/v1/chat/completions
```

Anthropic-compatible messages:
```bash
curl -sS \
  -H 'x-api-key: aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -H 'anthropic-version: 2023-06-01' \
  -d '{"model":"claude-3-opus-20240229","max_tokens":64,"messages":[{"role":"user","content":"hello"}]}' \
  https://<bff-host>/proxy/anthropic/v1/messages
```

