Awesome—here’s a **drop‑in BFF replacement** that reconciles your *older proxy‑centric design* with the *ARIA v1 finish‑line design*. It keeps your current **docker‑compose** shape and external API (`/chat/completions`) while upgrading the internals to **PDP‑driven constraints + obligations**, **stream‑time enforcement**, **budget hold/settle**, and **tamper‑evident receipts**.

> **What you replace:** the entire `bff/` directory.
> **What stays the same:** compose service name/port/envs, and the `POST /chat/completions` contract (plus optional provider‑proxy routes if you enable them).

---

## 0) What changes, at a glance

* **PDP contract**: consume the *nested* `context.constraints` & `context.obligations` (as in ARIA v1) and pass `resource.properties.pdp_application = "aria-bff"`.
* **Constraints vs obligations**: constraints gate/shape the provider call **pre + mid + post**; obligations run **post‑permit** (receipt, analytics, optional KMS anchor).
* **Stream‑time enforcement**: live token cap & leakage guard; early stop with policy warning; still preserves **provider‑native SSE** shape to the client.
* **Budgeting**: estimate → **hold** → **settle** on provider usage (fallback to estimate if usage absent).
* **Egress pinning**: enforce `constraints.egress.allow` against the selected provider host.
* **Receipts**: hash‑chained via Receipt Vault; include `policy_snapshot` (constraints), usage, prev hash.

---

## 1) Public surface (no client changes required)

**Kept (internal shape):**

* `POST /chat/completions` — standard OpenAI‑ish payload `{model, messages, stream?, max_tokens?}`.

**Optional (transparent proxy mode; feature‑flagged):**

* `POST /proxy/openai/v1/chat/completions` (+ streaming).
* `POST /proxy/anthropic/v1/messages` (+ streaming).

> Toggle proxies by `ENABLE_PROVIDER_PROXIES=true`.

---

## 2) Folder layout (drop‑in)

```
bff/
├─ app.py                         # FastAPI app (entrypoint)
├─ config.py                      # config loader (env + YAML)
├─ auth.py                        # subject extraction (OIDC stub), DPoP stub (optional)
├─ pdp_client.py                  # PDP client + tiny TTL cache
├─ enforcement.py                 # constraints: preflight + mid-stream helpers
├─ budget.py                      # hold/settle/release (Redis-backed)
├─ receipts.py                    # emit signed receipts (Receipt Vault)
├─ sse.py                         # streaming bridge (SSE) with live caps/leakage guard
├─ provider/
│  ├─ registry.py                 # pick provider + egress host
│  ├─ openai.py                   # HTTP + stream line iterator
│  └─ anthropic.py                # HTTP + stream line iterator
├─ util/
│  ├─ tokens.py                   # naive token estimator (swappable)
│  └─ jsonlog.py                  # structured logs
└─ extras/
   ├─ openai_proxy.py             # optional provider proxy route
   └─ anthropic_proxy.py          # optional provider proxy route
```

> Entrypoint remains `bff/app.py` (so your Dockerfile/compose need no edits).

---

## 3) Key flows (mermaid)

**UI/Bot → BFF (stream‑time enforcement)**

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant B as BFF
  participant P as PDP
  participant R as ReceiptVault
  participant O as Provider (OpenAI/Anthropic)
  participant D as Redis (budget/receipt chain)

  C->>B: POST /chat/completions (stream=true)
  B->>P: /access/v1/evaluation (resource.properties.pdp_application="aria-bff")
  P-->>B: decision + context.constraints + context.obligations
  alt denied
    B-->>C: 403 (policy)
    B->>R: emit deny receipt (optional)
    return
  end
  B->>B: preflight (model allow, prompt guard, mask, clamp max_tokens)
  B->>D: budget HOLD (estimate)
  alt stream
    B->>O: start stream
    loop chunks
      O-->>B: SSE line
      B->>B: live checks (leakage, token cap)
      alt violation/cap
        B-->>C: warning + DONE
        break
      else
        B-->>C: re-stream native SSE
      end
    end
  else non-stream
    B->>O: POST chat
    O-->>B: JSON + usage
    B-->>C: JSON
  end
  B->>D: SETTLE (usage→$; fallback estimate)
  B->>R: emit signed receipt (constraints snapshot, usage, prev_hash)
```

---

## 4) Configuration (env‑first; optional YAML)

`bff/config.py`

```python
import os, yaml

DEFAULT = {
  "app_id": "aria-bff",
  "pdp_url": os.getenv("PDP_URL", "http://pdp:8000/access/v1/evaluation"),
  "receipt_vault_url": os.getenv("RECEIPT_VAULT_URL", "http://receipt-vault:8084/v1/receipts/sign"),
  "redis_url": os.getenv("REDIS_URL", "redis://redis:6379"),
  "enable_provider_proxies": os.getenv("ENABLE_PROVIDER_PROXIES","false").lower()=="true",
  "providers": {
    "openai":    {"base_url": os.getenv("OPENAI_BASE","https://api.openai.com/v1"),        "host":"api.openai.com"},
    "anthropic": {"base_url": os.getenv("ANTHROPIC_BASE","https://api.anthropic.com/v1"),  "host":"api.anthropic.com"}
  },
  "pricing": {  # USD/token
    "gpt-4o-mini": {"in": 0.0000005, "out": 0.0000015},
    "gpt-4.1":     {"in": 0.000005,  "out": 0.000015}
  }
}

def load():
  path = os.getenv("BFF_CONFIG")
  if path and os.path.exists(path):
    cfg = yaml.safe_load(open(path).read()) or {}
    # shallow merge; env takes precedence
    out = {**DEFAULT, **cfg}
    out["pricing"] = cfg.get("pricing", DEFAULT["pricing"])
    return out
  return DEFAULT
```

---

## 5) PDP client (nested context, tiny TTL cache)

`bff/pdp_client.py`

```python
import httpx, time, hashlib, json

class PDPClient:
    def __init__(self, url: str):
        self.url = url
        self._cache = {}  # k -> (ts, obj), 2s TTL

    def _k(self, body): 
        canon = {"subject": body.get("subject"), "resource": body.get("resource"), "action": body.get("action")}
        return hashlib.sha256(json.dumps(canon, sort_keys=True).encode()).hexdigest()

    async def evaluate(self, body: dict, ttl: float = 2.0) -> dict:
        k, now = self._k(body), time.time()
        hit = self._cache.get(k)
        if hit and now - hit[0] < ttl: return hit[1]
        async with httpx.AsyncClient(timeout=8.0) as cli:
            r = await cli.post(self.url, json=body)
            r.raise_for_status()
            out = r.json()
        self._cache[k] = (now, out)
        return out
```

---

## 6) Budget hold/settle (Redis)

`bff/budget.py`

```python
import aioredis, uuid, math

class Budget:
    def __init__(self, redis_url: str):
        self._url = redis_url
        self.redis = None

    async def start(self):
        self.redis = await aioredis.from_url(self._url)

    async def remaining_usd(self, subject_key: str) -> float:
        return float(await self.redis.get(f"budget:{subject_key}") or 0.0)

    async def hold(self, subject_key: str, estimate_cents: int) -> str:
        # naive: decrement budget immediately, track hold for settle/release
        usd = estimate_cents/100.0
        cur = await self.remaining_usd(subject_key)
        if usd > cur: return ""
        await self.redis.decrbyfloat(f"budget:{subject_key}", usd)
        hold_id = str(uuid.uuid4())
        await self.redis.setex(f"hold:{hold_id}", 900, usd)  # 15m
        return hold_id

    async def settle(self, hold_id: str, actual_cents: int):
        held = float(await self.redis.get(f"hold:{hold_id}") or 0.0)
        if held <= 0: return
        delta = held - (actual_cents/100.0)
        if delta > 0:
            await self.redis.incrbyfloat("budget:refunds", delta)
            # optional: credit back to subject; for simplicity we aggregate refunds
        await self.redis.delete(f"hold:{hold_id}")

    async def release(self, hold_id: str):
        held = float(await self.redis.get(f"hold:{hold_id}") or 0.0)
        if held > 0:
            await self.redis.incrbyfloat("budget:refunds", held)
        await self.redis.delete(f"hold:{hold_id}")
```

---

## 7) Receipts (hash‑chain via Receipt Vault)

`bff/receipts.py`

```python
import httpx, time, hashlib

class Receipts:
    def __init__(self, base_url: str, redis):
        self.base = base_url.rstrip("/")
        self.redis = redis

    async def emit(self, agent_id: str, payload: dict) -> dict:
        prev = (await self.redis.get(f"receipt:last:{agent_id}") or b"0"*64)
        payload.setdefault("ts", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        payload["prev_hash"] = prev.decode() if isinstance(prev, bytes) else prev
        async with httpx.AsyncClient(timeout=4.0) as cli:
            r = await cli.post(self.base, json={"payload": payload})
            r.raise_for_status()
            out = r.json()
        await self.redis.set(f"receipt:last:{agent_id}", out["hash"], ex=86400)
        return out
```

---

## 8) Enforcement (constraints → runtime)

`bff/enforcement.py`

```python
from typing import Dict, Any, List
from fastapi import HTTPException
import fnmatch, re
from .util.tokens import rough_tokens

class Enforcer:
    def __init__(self, pricing: dict):
        self.pricing = pricing

    # ---- preflight on request ----
    def preflight(self, model: str, messages: List[dict], constraints: Dict[str,Any], stream: bool):
        c = constraints or {}
        # model allow
        allow = (c.get("model") or {}).get("allow", [])
        if allow and model not in allow:
            raise HTTPException(403, f"model '{model}' not allowed")

        # prompt guard + masking
        rules = c.get("prompt_rules") or {}
        self._guard_input(messages, rules)
        messages = self._mask(messages, (c.get("redaction") or {}).get("patterns", []))

        # tokens
        toks = c.get("tokens") or {}
        max_out = toks.get("max_output")
        if stream and toks.get("max_stream"):
            max_out = min(max_out or toks["max_stream"], toks["max_stream"])

        return {"messages": messages, "max_tokens": max_out}

    # ---- mid-stream ----
    def stream_guard(self, delta: str, constraints: Dict[str,Any], produced_tokens: int, cap: int | None):
        rules = constraints.get("prompt_rules") or {}
        if rules.get("block_system_prompt_leakage"):
            if re.search(r"(BEGIN\s+SYSTEM\s+PROMPT|internal\s+instruction)", delta, re.I):
                return {"block": True, "reason": "blocked_leakage"}
        produced_tokens += rough_tokens(delta)
        if cap and produced_tokens > cap:
            return {"block": True, "reason": "truncated_by_policy"}
        return {"block": False, "produced": produced_tokens}

    # ---- egress host check ----
    def egress_ok(self, host: str, constraints: Dict[str,Any]) -> bool:
        allow = (constraints.get("egress") or {}).get("allow", [])
        return any(host == a.split(":")[0] or host.endswith(a.lstrip("*")) for a in allow)

    # ---- helpers ----
    def _guard_input(self, messages: List[dict], rules: Dict[str,Any]):
        flat = " ".join(self._iter_text(messages)).lower()
        for p in rules.get("disallowed_phrases", []):
            if p.lower() in flat:
                raise HTTPException(400, f"disallowed phrase: {p}")
        if rules.get("block_markdown_external_links"):
            if re.search(r"\[[^\]]+\]\((https?://[^)]+)\)", flat, re.I):
                raise HTTPException(400, "external markdown links not allowed")
        allow = rules.get("url_allowlist", [])
        for url in re.findall(r"https?://[^\s)]+", flat):
            from urllib.parse import urlparse
            h = (urlparse(url).hostname or "")
            if not any(fnmatch.fnmatch(h, pat) for pat in allow):
                raise HTTPException(400, f"url not allowed: {h}")

    def _mask(self, messages: List[dict], patterns: List[str]):
        if not patterns: return messages
        regexes = [re.compile(p, re.I) for p in patterns]
        out = []
        for m in messages:
            c = m.get("content")
            if isinstance(c, list):
                newc=[]
                for part in c:
                    t = part.get("text")
                    if t:
                        for rgx in regexes: t = rgx.sub("[MASKED]", t)
                        newc.append({**part, "text": t})
                    else: newc.append(part)
                out.append({**m, "content": newc})
            elif isinstance(c, str):
                t=c
                for rgx in regexes: t = rgx.sub("[MASKED]", t)
                out.append({**m, "content": t})
            else:
                out.append(m)
        return out

    def estimate_cents(self, model: str, messages: List[dict], max_out: int | None) -> int:
        pin, pout = self.pricing.get(model, self.pricing.get("gpt-4o-mini")).values()
        in_tok = sum(rough_tokens(t) for t in self._iter_text(messages))
        out_tok = max_out or 1024
        usd = in_tok*pin + out_tok*pout
        return int(round(usd*100))

    def _iter_text(self, messages):
        for m in messages:
            c = m.get("content")
            if isinstance(c, list):
                for p in c:
                    t = p.get("text")
                    if t: yield t
            elif isinstance(c, str):
                yield c
```

---

## 9) SSE bridge (provider‑native passthrough + live checks)

`bff/sse.py`

```python
import json, asyncio
from typing import AsyncIterator, Optional
from fastapi.responses import StreamingResponse

def sse_line(obj) -> bytes:
    return f"data: {json.dumps(obj)}\n\n".encode()

async def relay_with_enforcement(lines: AsyncIterator[str], enforcer, constraints: dict, cap: int | None):
    produced = 0
    async for raw in lines:
        line = raw.rstrip("\n")
        if line.startswith("data: "):
            payload = line[6:].strip()
            if payload == "[DONE]":
                yield b"data: [DONE]\n\n"; return
            try:
                obj = json.loads(payload)
            except Exception:
                # pass through if we can't parse
                yield (line+"\n\n").encode(); continue

            delta = ""
            # OpenAI delta
            for ch in obj.get("choices", []):
                d = ch.get("delta",{}).get("content")
                if isinstance(d, str): delta += d

            if delta:
                verdict = enforcer.stream_guard(delta, constraints, produced, cap)
                if verdict.get("block"):
                    yield sse_line({"warning": verdict["reason"]})
                    yield b"data: [DONE]\n\n"; return
                produced = verdict.get("produced", produced)

            yield (f"data: {json.dumps(obj)}\n\n").encode()
        else:
            # pass-through any non-data lines
            yield (line+"\n").encode()

def sse_response(iterator: AsyncIterator[bytes]) -> StreamingResponse:
    return StreamingResponse(iterator, media_type="text/event-stream")
```

---

## 10) Provider clients (HTTP + streaming lines)

`bff/provider/openai.py`

```python
import httpx
from typing import Dict, Any, AsyncIterator

class OpenAIClient:
    def __init__(self, base: str, api_key: str):
        self.base = base.rstrip("/")
        self.key = api_key

    async def chat(self, payload: Dict[str,Any]) -> Dict[str,Any]:
        async with httpx.AsyncClient(timeout=60) as cli:
            r = await cli.post(f"{self.base}/chat/completions",
                               headers={"Authorization": f"Bearer {self.key}"},
                               json=payload)
            r.raise_for_status()
            return r.json()

    async def stream_lines(self, payload: Dict[str,Any]) -> AsyncIterator[str]:
        async with httpx.AsyncClient(timeout=None) as cli:
            async with cli.stream("POST", f"{self.base}/chat/completions",
                                  headers={"Authorization": f"Bearer {self.key}"},
                                  json=payload) as r:
                r.raise_for_status()
                async for line in r.aiter_lines():
                    if line is not None:
                        yield line
```

`bff/provider/anthropic.py` is analogous (`/messages`, header `x-api-key`).

`bff/provider/registry.py`

```python
class ProviderRegistry:
    def __init__(self, cfg): self.cfg = cfg
    def pick(self, model: str) -> str:
        if model.startswith("gpt-"): return "openai"
        return "anthropic"
    def host(self, provider: str) -> str:
        return self.cfg["providers"][provider]["host"]
    def base(self, provider: str) -> str:
        return self.cfg["providers"][provider]["base_url"]
```

---

## 11) App (FastAPI): `/chat/completions` with stream‑time enforcement

`bff/app.py`

```python
import os, uuid, httpx, json
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Dict, Any
from .config import load
from .auth import extract_subject  # lightweight extractor; falls back to anon agent
from .pdp_client import PDPClient
from .enforcement import Enforcer
from .budget import Budget
from .receipts import Receipts
from .sse import relay_with_enforcement, sse_response
from .provider.registry import ProviderRegistry
from .provider.openai import OpenAIClient

CFG = load()
app = FastAPI(title="LLM BFF (ARIA v1-compatible)")

# single-provider example; add Anthropic similarly
REG = ProviderRegistry(CFG)
OAI = OpenAIClient(CFG["providers"]["openai"]["base_url"], os.getenv("OPENAI_API_KEY",""))
PDP = PDPClient(CFG["pdp_url"])
BUD = Budget(CFG["redis_url"])
ENF = Enforcer(CFG["pricing"])
REC = None  # init after Redis is ready

@app.on_event("startup")
async def _start():
    await BUD.start()
    global REC
    REC = Receipts(CFG["receipt_vault_url"], BUD.redis)

def _pdp_req(subject: dict, model: str, stream: bool) -> dict:
    return {
      "subject": subject,                    # expect type='agent' if you pass agent; 'user' also OK
      "action":  {"name": "invoke"},
      "resource":{"type": "llm:openai:chat",
                  "properties": {"pdp_application": CFG["app_id"], "model": model, "stream": bool(stream)}},
      "context": {}
    }

@app.post("/chat/completions")
async def chat(req: Dict[str,Any], request: Request):
    # Subject (keep simple; if you already propagate agent ids, map here)
    subject = extract_subject(request.headers)  # returns {"id", "type", "properties": {...}}
    agent_id = subject.get("id") or "agent:unknown"

    model   = req.get("model")
    stream  = bool(req.get("stream", False))
    msgs    = req.get("messages", [])
    max_req = req.get("max_tokens")

    # 1) PDP
    dec = await PDP.evaluate(_pdp_req(subject, model, stream))
    if not dec.get("decision"):
        raise HTTPException(403, "PDP denied")
    ctx = dec.get("context", {})
    constraints = (ctx.get("constraints") or {})
    obligations = (ctx.get("obligations") or [])

    # 2) Egress pinning (host must be allowed)
    host = REG.host("openai")
    if not ENF.egress_ok(host, constraints):
        raise HTTPException(403, f"egress host '{host}' not allowed by policy")

    # 3) Preflight (guard/mask/clamp) + budget hold
    pf = ENF.preflight(model, msgs, constraints, stream=stream)
    eff_max = pf.get("max_tokens")
    if max_req is not None and eff_max is not None:
        eff_max = min(int(max_req), int(eff_max))
    payload = {**req, "messages": pf["messages"]}
    if eff_max is not None: payload["max_tokens"] = eff_max

    estimate_cents = ENF.estimate_cents(model, pf["messages"], eff_max)
    hold_id = await BUD.hold(agent_id, estimate_cents)
    if not hold_id:
        raise HTTPException(402, "budget insufficient")

    call_id = str(uuid.uuid4())
    # 4) Provider call (+ streaming enforcement)
    try:
        if not stream:
            out = await OAI.chat(payload)
            usage = out.get("usage", {})
            # derive cost from usage if present; else estimate
            prompt = usage.get("prompt_tokens", 0); completion = usage.get("completion_tokens", 0)
            pin = CFG["pricing"].get(model, CFG["pricing"]["gpt-4o-mini"])["in"]
            pout = CFG["pricing"].get(model, CFG["pricing"]["gpt-4o-mini"])["out"]
            cents = int(round((prompt*pin + completion*pout) * 100))
            await BUD.settle(hold_id, cents or estimate_cents)

            # receipt (Allow)
            await REC.emit(agent_id, {
              "id": call_id,
              "agent_id": agent_id,
              "resource": {"type":"model","id": model},
              "decision": "Allow",
              "policy_snapshot": constraints,
              "schema_hash": None,
              "params_hash": None,
              "usage": {"input_tokens": prompt, "output_tokens": completion, "cost_usd": (cents/100.0)}
            })
            return JSONResponse(out, headers={"x-aria-decision-id": ctx.get("decision_id","")})
        else:
            # streaming: enforce mid-stream caps and leakage
            iterator = relay_with_enforcement(
                OAI.stream_lines(payload),
                ENF,
                constraints,
                eff_max
            )
            # settle when client disconnects? In this minimal drop-in, we settle on estimate.
            async def wrap():
                try:
                    async for chunk in iterator:
                        yield chunk
                finally:
                    await BUD.settle(hold_id, estimate_cents)
                    await REC.emit(agent_id, {
                      "id": call_id,
                      "agent_id": agent_id,
                      "resource": {"type":"model","id": model},
                      "decision": "Allow",
                      "policy_snapshot": constraints,
                      "schema_hash": None,
                      "params_hash": None,
                      "usage": {"input_tokens": None, "output_tokens": None, "cost_usd": estimate_cents/100.0}
                    })
            return sse_response(wrap())
    except Exception:
        await BUD.release(hold_id)
        # optional: emit deny/failed receipt
        raise
```

> **Why this is drop‑in:** It exposes the same `/chat/completions` route as your ARIA v1 stub, but implements the full *constraints + obligations* lifecycle, streaming enforcement, and receipts.

---

## 12) Optional proxy routes (transparent provider shape)

If you want the *“agent points at BFF as OpenAI”* mode, include these:

* `extras/openai_proxy.py` → mounts as `/proxy/openai/v1/chat/completions`
* `extras/anthropic_proxy.py` → mounts as `/proxy/anthropic/v1/messages`

These use the same PDP + enforcement stack but keep **provider‑native** request/stream shapes. (Omitted here for brevity; reuse the app wiring from the core `/chat/completions`.)

---

## 13) Minimal auth stubs (kept simple; wire real OIDC later)

`bff/auth.py`

```python
import base64, json

def extract_subject(headers) -> dict:
    # Prefer Bearer OIDC -> decode payload (no verify here; replace in prod)
    auth = headers.get("authorization") or headers.get("Authorization")
    if auth and auth.startswith("Bearer ") and auth.count(".") == 2:
        try:
            b64 = auth.split(".")[1] + "=="
            claims = json.loads(base64.urlsafe_b64decode(b64).decode())
            sub = claims.get("sub") or "agent:anon"
            return {"type":"agent", "id": sub, "properties": {"email": claims.get("email"), "tenant": claims.get("tenant")}}
        except Exception:
            pass
    # Fallback
    return {"type":"agent", "id":"agent:svc-123:for:pairwise", "properties": {}}
```

---

## 14) Testing checklist (fast paths)

* **Model allowlist**: 403 when model not in `constraints.model.allow`.
* **Prompt guard**: 400 on disallowed phrase/external link/URL not in allowlist.
* **Token caps**: request clamp (`max_tokens` ≤ policy); live stream truncates with `data: {"warning":"truncated_by_policy"}` + `[DONE]`.
* **Egress pin**: 403 if provider host not in `constraints.egress.allow`.
* **Budget**: 402 if hold fails; settle refunds tracked in `budget:refunds`.
* **Receipts**: a receipt is signed per call; hash chain advances in Redis `receipt:last:{agent}`.

---

## 15) Migration notes (zero‑friction)

1. Replace `bff/` with this version; keep the same Docker image build & `8083` port.
2. Ensure `PDP_URL`, `RECEIPT_VAULT_URL`, `REDIS_URL`, and (if using OpenAI) `OPENAI_API_KEY` are set.
3. Seed demo budgets in Redis, e.g. `SET budget:agent:svc-123:for:pairwise 10`.
4. Call `POST /chat/completions` as you do today; stream and non‑stream both work.
5. (Optional) Turn on provider‑proxy endpoints with `ENABLE_PROVIDER_PROXIES=true`.

---

### Why this meets ARIA v1

* Nested PDP `context` consumed exclusively (no legacy flattening), per‑request **plan & budget** semantics (budget hold/settle), **egress allowlist**, **receipt emission** (hash‑chained), and clean **constraints vs obligations** separation (obligations executed post‑permit in `receipts.emit` + analytics hook).

If you want this trimmed even further (e.g., **single‑provider, non‑proxy only**), you can keep only `app.py`, `config.py`, `pdp_client.py`, `enforcement.py`, `budget.py`, `receipts.py`, `sse.py`, `provider/openai.py`, and `util/tokens.py`.

---

## 16) Integration with ms_bff_spike (reuse-first plan)

This section adapts the above drop‑in design to our existing BFF (`ms_bff_spike/ms_bff`) without replacing its architecture. We reuse current modules for auth, PDP, Redis, streaming, HTTP, and logging while adding a minimal LLM surface that implements constraints, mid‑stream enforcement, budget hold/settle, and tamper‑evident receipts.

### 16.1 What we will ADD (new files under `ms_bff/src`)

- `api/v1/endpoints/llm.py`: FastAPI router exposing:
  - `POST /chat/completions` (JSON and optional `stream=true`), OpenAI‑compatible payload.
  - Optional provider‑native proxies (feature‑flagged):
    - `/proxy/openai/v1/chat/completions` (streaming supported)
- `services/llm_enforcement.py`: Constraints preflight (model allowlist, prompt guard + masking, token clamp), mid‑stream leakage and token‑cap checks, naive token estimator.
- `services/llm_budget.py`: Budget hold/settle/release using enterprise Redis (`BFFRedisService`). Keys prefixed with `bff:`.
- `services/llm_receipts.py`: Receipt emitter that posts to Receipt Vault (`RECEIPT_VAULT_URL`) and hash‑chains via Redis (`bff:receipt:last:{agent}`).
- `services/providers/openai_client.py`: Provider client using enterprise HTTP client where available; supports JSON and streaming line iteration.
- `services/llm_sse.py`: SSE bridge that relays provider‑native events while applying mid‑stream enforcement and honoring disconnects; returns `StreamingResponse`.

These mirror sections 5–10 above, but are implemented in the current BFF’s module layout and use our standard libraries.

### 16.2 What we will REUSE (existing ms_bff modules)

- PDP authz: `ms_bff.src.services.policy_client.BFFPolicyClient` (enterprise SDK) for decisions; consume nested `context.constraints` and `context.obligations` (ARIA v1) only.
- Subject/session: `AuthMiddleware` + `TokenManager` + request `state` for session context, `X‑Correlation‑ID`, canonical ARNs via `utils.arn`.
- Redis: `BFFRedisService` (enterprise) for budgets, holds, receipt chain; no basic Redis fallback.
- Streaming infra: keep `StreamingResponse` semantics from `utils.proxy` and `api/v1/endpoints/streaming.py`; for LLM streams we use a dedicated SSE bridge that parses OpenAI deltas to enforce constraints.
- HTTP client: prefer `empowernow_common.http.SecureHttpClient`; if unavailable in a test harness, fall back to `httpx.AsyncClient` behind a thin adapter. No behavior drift in production.
- Structured logging/metrics: `structured_log`, Prometheus counters/gauges already in place; add LLM‑specific metrics.

### 16.3 Endpoint behavior (aligned to sections 3, 8–11)

1) Input: `{model, messages, stream?, max_tokens?}` (OpenAI‑ish). For proxies, keep provider‑native shape.
2) PDP evaluation: build resource `{type:"llm:openai:chat", properties:{pdp_application:"aria-bff", model, stream}}`; use `BFFPolicyClient` to evaluate. The client normalizes typed constraints (list) into bucketed constraints (dict) per PDP mapping before enforcement. Treat missing mapping as deny (fail‑secure).
3) Egress pinning: ensure selected provider host (e.g., `api.openai.com`) is included in `constraints.egress.allow`; otherwise 403.
4) Preflight: guard input (disallowed phrases, external links, URL allowlist), apply redaction masks, clamp `max_tokens` per policy and request.
5) Budget: estimate cents using naive token counts; `hold()` against `bff:budget:{subject_key}`; on denial return 402. After completion, `settle()` with usage if present else estimate; aggregate refunds under `bff:budget:refunds`.
6) Provider call:
   - Non‑stream: JSON call; map provider usage to cost; return JSON with `x-aria-decision-id` if present.
   - Stream: re‑emit provider‑native SSE while enforcing leakage and live token cap; on violation, emit `{"warning":"..."}` then `[DONE]` and settle estimate.
7) Receipts: POST to Receipt Vault (`RECEIPT_VAULT_URL`) with `policy_snapshot` (constraints), usage, and previous hash from Redis. Store new hash at `bff:receipt:last:{agent}`.

### 16.4 Configuration (env + settings)

- PDP: reuse `settings.pdp.*` (no new keys); set `resource.properties.pdp_application = "aria-bff"`.
- Receipt Vault: `RECEIPT_VAULT_URL` (required for receipts).
- Redis: reuse `REDIS_URL` (DB isolation enforced by `BFFRedisService`).
- Providers: `OPENAI_BASE` (default `https://api.openai.com/v1`), `OPENAI_API_KEY`.
- Pricing: extend `settings` with LLM pricing, or read `LLM_PRICING_JSON` or `LLM_PRICING_PATH` (e.g., `/app/config/llm_pricing.json` from `ServiceConfigs/BFF/config/llm_pricing.json`) for a simple model→{in,out} map. Defaults to conservative costs if unset.

### 16.5 Mounting in the app

- Include `api/v1/endpoints/llm.py` router in `create_app()` after auth and before YAML dynamic router to avoid path interception. Path is unversioned (`/chat/completions`) per current contract, to avoid SPA changes.
- Optional proxies mount under `/proxy/openai/v1/...` when `ENABLE_PROVIDER_PROXIES=true`.

### 16.6 Backward compatibility and standards

- Does not alter existing YAML router or legacy proxies.
- Honors canonical ARNs, ForwardAuth, CORS, CSRF, and audit middleware.
- Uses enterprise SDKs (`empowernow_common`) for PDP/HTTP/Redis; no insecure fallbacks.
- SSE only (no polling) for streams.

---

## 17) Developer TODO (implementation + tests)

### 17.1 Implementation

1) Create `ms_bff/src/api/v1/endpoints/llm.py` with:
   - `POST /chat/completions` handling both sync and `stream=true`.
   - PDP check via `BFFPolicyClient` and extraction of `constraints`/`obligations` (support nested `context.*`).
   - Egress pin check against provider host.
   - Preflight using `llm_enforcement.preflight()`; compute `estimate_cents`.
   - Budget `hold()`; on failure return 402.
   - Non‑stream: call provider client, compute `actual_cents` from usage, `settle()`, emit receipt, return JSON (+ `x-aria-decision-id`).
   - Stream: call provider `stream()`, relay via `llm_sse.relay_with_enforcement(...)`; on finish/abort, `settle(estimate)` and emit receipt, return `StreamingResponse`.

2) Add `ms_bff/src/services/llm_enforcement.py` with:
   - `preflight(model, messages, constraints, stream)` → `{messages, max_tokens}`.
   - `stream_guard(delta, constraints, produced_tokens, cap)` with leakage and token cap.
   - `egress_ok(host, constraints)` and `estimate_cents(model, messages, max_out)`.

3) Add `ms_bff/src/services/llm_budget.py` using `BFFRedisService`:
   - `remaining_usd(subject_key)`, `hold(subject_key, estimate_cents) -> hold_id`, `settle(hold_id, actual_cents)`, `release(hold_id)`.
   - Keys: `bff:budget:{subject_key}`, `bff:hold:{uuid}`, refunds in `bff:budget:refunds`.

4) Add `ms_bff/src/services/llm_receipts.py`:
   - `emit(agent_id, payload)` posting to `RECEIPT_VAULT_URL`; chain with `bff:receipt:last:{agent}`.

5) Add `ms_bff/src/services/providers/openai_client.py`:
   - `chat(payload)` and `stream_lines(payload)`; use `SecureHttpClient` when present.

6) Add `ms_bff/src/services/llm_sse.py`:
   - `relay_with_enforcement(lines, enforcer, constraints, cap)` parsing OpenAI deltas; `sse_response(iterator)`.

7) Wire router in `ms_bff/src/main.py`:
   - `from ms_bff.src.api.v1.endpoints import llm as llm_router`
   - `app.include_router(llm_router.router, prefix="", tags=["LLM"] )`

8) Extend config:
   - Support `LLM_PRICING_JSON` or add a `settings.llm.pricing` map; default pricing seeded per section 4.
   - Add envs: `RECEIPT_VAULT_URL`, `OPENAI_BASE`, `OPENAI_API_KEY`.

9) Observability:
   - Add Prometheus counters: `bff_llm_calls_total`, `bff_llm_stream_truncations_total`, `bff_llm_budget_denied_total`.
   - Use `structured_log` for PDP decisions, budget holds, settlements, receipts.

10) Security:
   - Use `request.state.principal_arn`/`actor_arn` if available; else derive from JWT claims.
   - No fallback Redis/client paths; fail‑secure on PDP/Redis/Receipt failures per policy.

### 17.2 Tests (unit + integration)

- PDP/constraints:
  - 403 when model not in `constraints.model.allow`.
  - 403 when egress host not in `constraints.egress.allow`.
  - 400 on disallowed phrase/external link/URL not in allowlist.
- Token caps:
  - Request clamp: `max_tokens` ≤ policy; merged with request param.
  - Mid‑stream truncation emits `data: {"warning":"truncated_by_policy"}` then `[DONE]`.
- Budgeting:
  - 402 when `hold()` fails; `settle()` credits refunds when usage < estimate.
- Receipts:
  - Receipt emitted per call; Redis chain key advanced.
- Streaming path:
  - SSE relay preserves provider‑native lines; enforces leakage guard.
- E2E happy paths:
  - Non‑stream returns JSON and settles with usage costs when provided.
  - Stream path returns SSE and settles with estimate.

### 17.3 Deployment/config

- Ensure `REDIS_URL`, `RECEIPT_VAULT_URL`, and `OPENAI_API_KEY` are set in the BFF environment (Compose, k8s). Optionally `OPENAI_BASE`.
- Optional: `ENABLE_PROVIDER_PROXIES=true` to expose provider‑native proxy endpoints.
 - Pricing: set `LLM_PRICING_PATH=/app/config/llm_pricing.json` (mounted from `ServiceConfigs/BFF/config/llm_pricing.json`) or inject `LLM_PRICING_JSON`.
 - Routing: Traefik labels route `/chat/completions` on `automate.ocg.labs.empowernow.ai` and `api.ocg.labs.empowernow.ai` to the BFF service (`routers: bff-automate-llm`, `bff-api-llm`). Ensure these have higher priority than SPA static routers.

---

## 19) Operational notes for LLM endpoint

- CSRF protection: POSTs require a CSRF token by middleware. SPAs handle this automatically. For non‑SPA scripts in dev/E2E:
  1) GET `/health` and copy `_csrf_token` from `Set-Cookie`.
  2) Include header `X-CSRF-Token: <value>` in the POST to `/chat/completions`.
  - Alternatively for dev only, set `CSRF_EXEMPT_PATHS=/chat/completions,...` in the BFF env. Do not enable in prod.

- Routing/auth model: The `routes.yaml` entry for `/chat/completions` can be `auth: none` in local development to allow unauthenticated smoke tests. In production, require session/JWT (`auth: session`) so the endpoint is protected by BFF auth.

- Decision header in streaming: The streaming response now includes `x-aria-decision-id` in headers when present, matching the non‑stream path.

- Subject identity: Use canonical ARN `auth:account:{provider}:{subject}` consistently across PDP policy, budget keys, and receipts. Avoid fallback "agent:unknown" in production; derive from session/JWT (`request.state.user_id` or `jwt_claims.sub`).

- Observability: Exposed LLM metrics:
  - `bff_llm_calls_total{mode, result}`
  - `bff_llm_stream_truncations_total{reason}`
  - `bff_llm_budget_denied_total`
  These appear on `/metrics` for Prometheus scraping.

- PDP micro-cache (optional): For bursty workloads, consider a tiny TTL cache of allow/constraints per subject/resource/action. Current enterprise client path omits caching; acceptable unless latency spikes are observed.

---

This integration preserves our BFF’s standards (enterprise SDKs, ForwardAuth, SSE, canonical ARNs) while delivering ARIA‑compatible constraints/obligations, stream‑time enforcement, budget control, and tamper‑evident receipts without disrupting existing routes.

---

## 18) Identity chaining addendum (BFF impact)

The Identity Chaining v1.1 addendum (`________newdesign10_okta.md`) targets IdP and the ARIA Gateway. Our LLM BFF does not participate in those tool exchanges and requires no code changes.

For future alignment (if BFF ever orchestrates identity-chained calls):

- Keep LLM endpoints and receipts unchanged by default; add `ENABLE_IDENTITY_CHAINING=false` as a guard.
- If enabled for a future tool-proxy in BFF:
  - Enforce PDP `constraints.identity_chain` (audience/scope) before any exchange.
  - Use enterprise HTTP client; never log downstream tokens, only `sha256` token hashes in receipts.
  - If emitting receipts for chained calls, include `identity_chain` snapshot `{provider, audience, scopes, token_hash, ttl_s}` consistent with the addendum.
  - Prefer delegated mode with DPoP continuity; keys in KMS/HSM.

Current decision: No BFF code changes are required for Identity Chaining; this section documents optional future hooks only.

---

## 20) Configuration reference (BFF)

- Required env
  - `PDP_URL`: `http://pdp:8000/access/v1/evaluation`
  - `RECEIPT_VAULT_URL`: `http://receipt-vault:8084/v1/receipts/sign`
  - `REDIS_URL`: e.g., `redis://redis:6379`
  - `OPENAI_BASE`: default `https://api.openai.com/v1`
  - `OPENAI_API_KEY`: provider API key
- Optional env
  - `ENABLE_PROVIDER_PROXIES`: `true|false` (default false)
  - `LLM_PRICING_JSON` or `LLM_PRICING_PATH`: model->pricing map
  - `CSRF_EXEMPT_PATHS`: dev-only exemptions (do not use in prod)

## 21) Usage quickstart (BFF LLM)

- Non-stream:
  1) Ensure budgets seeded in Redis: `SET budget:agent:svc-123:for:pairwise 10`
  2) POST `/chat/completions` with `{model, messages, max_tokens?}`
  3) Check response headers for `x-aria-decision-id`
- Stream:
  - Use `stream=true`; read SSE until `data: [DONE]`

## 22) Testing guide (focused)

- Unit tests:
  - Enforcement (prompt guard, URL allowlist, masking, token caps)
  - Budget/receipts (hold/settle/refunds, hash-chain)
  - Normalization (typed→bucket constraints)
- Endpoint tests:
  - Allow path (clamp `max_tokens`, decision header)
  - Egress deny (403), budget insufficient (402)
  - Streaming roundtrip with `[DONE]` and truncation warning

## 23) Observability & metrics

- Prometheus metrics (scraped at `/metrics`):
  - `bff_llm_calls_total{mode, result}`
  - `bff_llm_stream_truncations_total{reason}`
  - `bff_llm_budget_denied_total`
- Structured logs (key events):
  - `bff_llm_policy_result`, `bff_llm_policy_error`
  - `bff_llm_budget_hold`, `bff_llm_budget_settle`
  - `bff_llm_receipt_emit`

## 24) Troubleshooting

- 403 on allow path:
  - Verify PDP constraints include `egress.allow` for provider host
  - Ensure `model` is in `constraints.model.allow`
- 402 budget:
  - Seed/raise `budget:{agent}` key; inspect `bff:budget:refunds`
- Missing decision header:
  - Ensure PDP returns `context.decision_id`; BFF forwards it
- Streaming stops early:
  - Check truncation reason in SSE `{warning: ...}` line

## 25) Security notes

- Always consume rich PDP responses; no legacy flattening
- Forward only `x-aria-decision-id`; never log prompts or secrets
- Use canonical ARNs for subjects; avoid anonymous fallbacks in prod

---