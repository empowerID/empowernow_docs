# Dev Tools Guide: Cursor, VS Code, Claude Code, Copilot — Using PATs via BFF

## Overview
Use an IdP-issued Personal Access Token (PAT) with your editor to call OpenAI/Anthropic through the BFF proxy. The BFF authenticates you, enforces policy/budgets, and uses server-held vendor keys.

- OpenAI base: `https://<bff-host>/proxy/openai/v1`
- Anthropic base: `https://<bff-host>/proxy/anthropic/v1`
- Token: `aria_pat_XXXXXXXXXXXXXXXX`

## 1) Get a PAT
- IdP UI → PATs → New PAT → copy once and store securely. See `IdP/docs/PAT_Management_UI_Guide.md`.

## 2) Cursor (OpenAI-compatible)
Set environment or app settings:
```bash
OPENAI_BASE_URL=https://<bff-host>/proxy/openai/v1
OPENAI_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```
Notes:
- Do not set org/project headers; BFF pins them.
- Streaming works as usual.

### Postman-friendly cURL (Cursor/OpenAI-style)
```bash
curl -sS \
  -H 'Authorization: Bearer aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/openai/v1/chat/completions
```

## 3) VS Code
### Option A: Continue extension (supports custom OpenAI/Anthropic endpoints)
- Install Continue (Marketplace id: Continue.continue)
- Configure provider:
  - OpenAI: baseUrl `https://<bff-host>/proxy/openai/v1`, apiKey `aria_pat_…`
  - Anthropic: baseUrl `https://<bff-host>/proxy/anthropic/v1`, apiKey `aria_pat_…`

### Option B: SDKs or CLI in integrated terminal
- Export env vars (as shown for Cursor) and use OpenAI/Anthropic SDKs in your repo.

### GitHub Copilot (important)
- Copilot/Copilot Chat currently do not support custom LLM endpoints or bring-your-own OpenAI/Anthropic base URLs.
- Use Cursor or the Continue extension for BFF-routed models, or keep Copilot for AI pair programming while using BFF for scripts/tools.

## 4) Claude Code (Anthropic-compatible)
Set environment or app settings:
```bash
ANTHROPIC_BASE_URL=https://<bff-host>/proxy/anthropic/v1
ANTHROPIC_API_KEY=aria_pat_XXXXXXXXXXXXXXXX
```

### Postman-friendly cURL (Claude/Anthropic-style)
```bash
curl -sS \
  -H 'x-api-key: aria_pat_XXXXXXXXXXXXXXXX' \
  -H 'Content-Type: application/json' \
  -H 'anthropic-version: 2023-06-01' \
  -d '{"model":"claude-3-opus-20240229","max_tokens":64,"messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/anthropic/v1/messages
```

## 5) Quick cURL smoke test
```bash
# OpenAI-compatible
curl -sS \
  -H 'Authorization: Bearer aria_pat_…' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/openai/v1/chat/completions | jq .

# Anthropic-compatible
curl -sS \
  -H 'x-api-key: aria_pat_…' \
  -H 'Content-Type: application/json' \
  -H 'anthropic-version: 2023-06-01' \
  -d '{"model":"claude-3-opus-20240229","max_tokens":64,"messages":[{"role":"user","content":"ping"}]}' \
  https://<bff-host>/proxy/anthropic/v1/messages | jq .
```

## 6) Troubleshooting (quick)
- 401/403: Check PAT validity; ensure you pasted PAT in the vendor-native header.
- 429: Rate limit (provider or introspection). Retry with backoff.
- Circuit open: IdP/BFF protection triggered—try later and check status.
- For more, see `ms_bff_spike/ms_bff/docs/Troubleshooting_PAT_Proxy.md`.

## 7) Tips
- Use model aliases; BFF normalizes to canonical names where configured.
- Avoid setting vendor org/project headers—BFF pins centrally.
- Optional hints: `X-Client-Id`, `X-Pairwise`.

## See also
- Quickstart: `Developer_Quickstart_PAT_Proxy.md`
- API reference: `Proxy_API_Reference.md`
- Tools one-pagers: `docs/tools/`
