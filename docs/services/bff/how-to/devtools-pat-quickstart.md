---
title: Dev Tools Quickstart with PAT (OpenAI/Anthropic Proxies)
---

## Base URLs
- OpenAI: `https://<bff-host>/proxy/openai/v1`
- Anthropic: `https://<bff-host>/proxy/anthropic/v1`

## Get a PAT
- Issue in IdP UI or via API (see IdP PAT how‑to). Format: `aria_pat_...` (copy once).

## Cursor (OpenAI interface)
```bash
OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

## Claude Code (Anthropic interface)
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
resp = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":"Hello"}])
print(resp)
```

## Notes
- Do not send vendor org/project headers; BFF pins server‑side.
- PAT requests are attributed to your identity; budgets/policy apply.

See also
- Vendor proxy auth: `services/bff/explanation/vendor-proxy-auth.md`
- Troubleshooting: `Troubleshooting_PAT_Proxy.md`

