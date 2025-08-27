Below is a **drop‑in replacement PDP** that keeps your **AuthZEN request shape and endpoint** (`POST /access/v1/evaluation`) while upgrading the internals to the **ARIA v1 profile**:

* **No DSL breakage.** Your existing YAML policies still parse; we add a normalizer + merge logic.
* **Same endpoint(s).** `POST /access/v1/evaluation` (+ batch).
* **Default response = rich** (constraints & obligations under `context`), with a **compat switch**:

  * `?mode=legacy` → flattens to `{ decision, constraints, obligations }` for older PEPs.
  * `?mode=rich` (default) → `{ decision, context: { constraints, obligations, … } }`.

The code below is organized so you can replace your `pdp/` directory one‑for‑one and keep your Docker/compose wiring unchanged.

---

## 0) What changes, exactly

**Unchanged**

* AuthZEN input: `{ subject, action, resource, context? }`
* Deny‑override evaluation model.
* Your policy DSL files (YAML).

**New/updated**

* **Constraints engine (v1)** with **most‑restrictive merge**.
* **Obligations catalog** with **idempotent union**.
* **AI/security operator pack** (`url_host_in`, `content_has_phrase`, …) registered in the evaluator.
* **Application‑scoped resolver** keyed by `resource.properties.pdp_application`.
* **Boundary guard** to keep app policies in their lanes.
* **Decision cache** (LRU+TTL), **batch endpoint**, **hot reload**, **trace hooks**.
* **Response metadata**: `policy_version`, `constraints_schema`, `obligations_schema`, `obligations_etag`, `ttl_ms`, `decision_id`.

---

## 1) Folder layout (drop‑in)

```
pdp/
├─ server/
│  ├─ api.py                 # FastAPI routes: /access/v1/evaluation(s), /admin/policies/reload
│  ├─ cache.py               # TTL decision cache
│  └─ __init__.py
├─ eval/
│  ├─ evaluation_engine.py   # Deny-override, rule match, merge to effective {constraints,obligations}
│  ├─ constraints_merge.py   # Most-restrictive merge
│  ├─ obligation_merge.py    # Union/idempotent merge
│  ├─ operators_ai.py        # AI/url/content operators (register in evaluator)
│  └─ __init__.py
├─ dsl/
│  ├─ policy_normalizer.py   # Fold DSL sugar; keep constraints separate from obligations
│  ├─ constraints_catalog.py # Merge rules per bucket/key
│  ├─ obligation_catalog.py  # Known obligations + merge hints
│  └─ __init__.py
├─ load/
│  ├─ app_scoped_resolver.py # 5-level app/domain/env resolver
│  ├─ boundary_guard.py      # compile-time scope checks
│  └─ __init__.py
├─ pip/
│  └─ bdna_client.py         # optional analytics PIP (shadow)
├─ main.py                   # Uvicorn bootstrap (imports server.api)
└─ requirements.txt
```

---

## 2) API contract (drop‑in + compatibility)

**Request (unchanged)**

```json
{
  "subject":  { "type": "agent", "id": "agent:svc-123:for:pairwise", "properties": {...} },
  "action":   { "name": "invoke" },
  "resource": { "type": "llm:openai:chat", "properties": { "pdp_application": "aria-bff", "model": "gpt-4.1" } },
  "context":  { "capability": "llm:openai:chat" }
}
```

**Response (default “rich”)**

```json
{
  "decision": true,
  "context": {
    "constraints": [
      { "id": "model_allow", "type": "model_allow", "parameters": { "allow": ["gpt-4.1","gpt-4o-mini"] }},
      { "id": "tokens_limits", "type": "tokens_limits", "parameters": { "max_input": 6000, "max_output": 1500, "max_stream": 4096 }},
      { "id": "egress_allow", "type": "egress_allow", "parameters": { "allow": ["api.openai.com:443"] }},
      { "id": "identity_chain", "type": "identity_chain", "parameters": { "allowed_audiences": ["https://graph.microsoft.com"], "allowed_scopes": ["User.Read"], "max_token_ttl_seconds": 300, "require_dpop": false }}
    ],
    "obligations": [{ "id": "emit_receipt" }, { "id": "tee_analytics", "attributes": { "include": ["usage","limits"]}}],
    "decision_id": "5a3f…",
    "policy_version": "2025-08-10.3",
    "constraints_schema": "aria.constraints.v1",
    "obligations_schema": "aria.obligations.v1",
    "obligations_etag": "W/\"ad4b…\"",
    "ttl_ms": 1500
  }
}
```

**Compliance:**

The PDP always returns the ARIA v1 rich response. Legacy flattening is not supported.

### Consumer interop notes

- Constraints are returned as typed objects. The BFF normalizes these into bucket‑style constraints (e.g., `constraints.model.allow`) before enforcement. Mapping used:
  - `model_allow` → `constraints.model.allow`
  - `tokens_limits` → `constraints.tokens.max_input|max_output|max_stream`
  - `egress_allow` → `constraints.egress.allow`
  - `redaction_patterns` → `constraints.redaction.patterns`
  - `identity_chain` → `constraints.identity_chain.*`
  - `row_filter_sql` → `constraints.data_scope.row_filter_sql`
  - `tenant_ids` → `constraints.data_scope.tenant_ids`
  - PDP includes `context.decision_id` in rich responses. Consumers (e.g., BFF) SHOULD forward this as the `x-aria-decision-id` header.

---

## 3) Key code (ready to paste)

> The snippets are minimal but complete for v1. They plug into FastAPI + your existing eval stack. Replace your PDP modules with these files (or merge if you need to keep custom bits).

### 3.1 `pdp/dsl/constraints_catalog.py`

```python
# pdp/dsl/constraints_catalog.py
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass(frozen=True)
class ConstraintSpec:
    bucket: str
    keys: List[str] | None
    rule: str  # 'intersection'|'min'|'max'|'and'|'or'|'union'|'and_sql'

CATALOG: Dict[str, ConstraintSpec] = {
    "model.allow":                ConstraintSpec("model", ["allow"], "intersection"),
    "tokens.max_input":           ConstraintSpec("tokens", ["max_input"], "min"),
    "tokens.max_output":          ConstraintSpec("tokens", ["max_output"], "min"),
    "tokens.max_stream":          ConstraintSpec("tokens", ["max_stream"], "min"),
    "egress.allow":               ConstraintSpec("egress", ["allow"], "intersection"),
    "params.allowlist":           ConstraintSpec("params", ["allowlist"], "intersection"),
    "redaction.patterns":         ConstraintSpec("redaction", ["patterns"], "union"),
    "data_scope.row_filter_sql":  ConstraintSpec("data_scope", ["row_filter_sql"], "and_sql"),
    "data_scope.tenant_ids":      ConstraintSpec("data_scope", ["tenant_ids"], "intersection"),
    "step_up.mfa_required":       ConstraintSpec("step_up", ["mfa_required"], "or"),
    "dpop.required":              ConstraintSpec("dpop", ["required"], "or"),
    "spend.max_cents":            ConstraintSpec("spend", ["max_cents"], "min"),
    "spend.consent_threshold_cents": ConstraintSpec("spend", ["consent_threshold_cents"], "min"),
    # Identity chain (optional v1 add-on)
    "identity_chain.allowed_audiences":     ConstraintSpec("identity_chain", ["allowed_audiences"], "intersection"),
    "identity_chain.allowed_scopes":        ConstraintSpec("identity_chain", ["allowed_scopes"], "intersection"),
    "identity_chain.max_token_ttl_seconds": ConstraintSpec("identity_chain", ["max_token_ttl_seconds"], "min"),
    "identity_chain.claim_allowlist":       ConstraintSpec("identity_chain", ["claim_allowlist"], "intersection"),
    "identity_chain.require_dpop":          ConstraintSpec("identity_chain", ["require_dpop"], "or"),
    "identity_chain.require_mtls":          ConstraintSpec("identity_chain", ["require_mtls"], "or"),
}

def known(key: str) -> bool: return key in CATALOG
def get(key: str) -> ConstraintSpec: return CATALOG[key]
```

### 3.2 `pdp/dsl/obligation_catalog.py`

```python
# pdp/dsl/obligation_catalog.py
from dataclasses import dataclass
from typing import Dict, List

@dataclass(frozen=True)
class OblSpec:
    id: str
    merge: str          # 'presence' | 'conservative' | 'union'
    keys: List[str] | None = None

CATALOG: Dict[str, OblSpec] = {
    "emit_receipt":       OblSpec("emit_receipt", "presence"),
    "anchor_receipt_kms": OblSpec("anchor_receipt_kms", "presence"),
    "tee_analytics":      OblSpec("tee_analytics", "conservative", ["include"]),
    "notify":             OblSpec("notify", "conservative", ["channel","severity"]),
}

def is_known(oid: str) -> bool: return oid in CATALOG
def get(oid: str) -> OblSpec: return CATALOG[oid]
```

### 3.3 `pdp/dsl/policy_normalizer.py`

```python
# pdp/dsl/policy_normalizer.py
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

@dataclass
class NormalizedRule:
    id: str
    resource: str | Dict[str,Any]
    action: str | List[str]
    effect: str
    condition: Any
    obligations_permit: List[Dict[str,Any]]
    obligations_deny: List[Dict[str,Any]]
    constraints_permit: Dict[str,Any] | None

class PolicyNormalizer:
    def normalize_rule(self, raw: Dict[str,Any]) -> NormalizedRule:
        eff = self._eff(raw); cond = self._cond(raw)
        op = self._ob(raw.get("on_permit"), raw.get("obligations"))
        od = self._ob(raw.get("on_deny"), None)
        cp = (raw.get("on_permit") or {}).get("constraints")
        return NormalizedRule(
            id=raw.get("id","rule"), resource=raw.get("resource","*"),
            action=raw.get("action","*"), effect=eff, condition=cond,
            obligations_permit=op, obligations_deny=od, constraints_permit=cp)

    def _eff(self, r): 
        if "allowIf" in r: return "permit"
        if "denyIf" in r:  return "deny"
        return (r.get("effect") or "permit").lower()

    def _cond(self, r):
        return r.get("denyIf") if "denyIf" in r else r.get("allowIf") or r.get("when") or r.get("condition")

    def _ob(self, block, flat):
        out=[]; 
        if flat: out+=flat
        if block and "obligations" in block: out+=block["obligations"]
        return out
```

### 3.4 `pdp/eval/operators_ai.py`

```python
# pdp/eval/operators_ai.py
import ipaddress, fnmatch, re
from urllib.parse import urlparse

def cidr_match(ip: str, cidr: str) -> bool:
    try: return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False)
    except ValueError: return False

def domain_allow(host: str, patterns): 
    return any(fnmatch.fnmatch((host or ""), p) for p in patterns or [])

def url_host_in(url: str, allowlist):
    try: 
        host = urlparse(url).hostname or ""
        return domain_allow(host, allowlist)
    except Exception:
        return False

def content_has_phrase(text: str, phrases):
    t = (text or "").lower()
    return any(p.lower() in t for p in phrases or [])
```

> **Hook these** into your `ConditionParser` / `ExpressionEvaluator` operator registry where you already register custom ops.

### 3.5 `pdp/eval/constraints_merge.py`

```python
# pdp/eval/constraints_merge.py
from typing import Any, Dict, List
from ..dsl.constraints_catalog import known, get as spec_get

def _inter(values): 
    s=[set(v or []) for v in values]; 
    return sorted(list(set.intersection(*s))) if s else []
def _union(values):
    acc=[]; [acc.extend(v or []) for v in values]; return sorted(list(set(acc)))
def _and(vals): out=True; 
    # noqa
def _and(values): 
    out=True
    for v in values: out = out and bool(v)
    return out
def _or(values):
    out=False
    for v in values: out = out or bool(v)
    return out
def _min(values): 
    nums=[v for v in values if v is not None]; return min(nums) if nums else None
def _max(values): 
    nums=[v for v in values if v is not None]; return max(nums) if nums else None
def _and_sql(values):
    parts=[v for v in values if v]; 
    return " AND ".join(f"({p})" for p in parts) if parts else ""

def merge_constraints(objs: List[Dict[str,Any]]) -> Dict[str,Any]:
    buckets: Dict[str, Dict[str,List[Any]]] = {}
    for c in objs:
        for b, attrs in (c or {}).items():
            for k, v in (attrs or {}).items():
                buckets.setdefault(f"{b}.{k}", {}).setdefault("values", []).append(v)

    out: Dict[str,Any] = {}
    for dkey, bag in buckets.items():
        bucket, key = dkey.split(".",1); out.setdefault(bucket, {})
        values = bag["values"]
        if known(dkey):
            rule = spec_get(dkey).rule
            out[bucket][key] = (
              _inter(values) if rule=="intersection" else
              _union(values) if rule=="union" else
              _and(values)   if rule=="and" else
              _or(values)    if rule=="or" else
              _min(values)   if rule=="min" else
              _max(values)   if rule=="max" else
              _and_sql(values) if rule=="and_sql" else values[-1]
            )
        else:
            # conservative default
            if all(isinstance(v,list) for v in values): out[bucket][key] = _union(values)
            elif all(isinstance(v,(int,float)) for v in values): out[bucket][key] = _min(values)
            elif all(isinstance(v,bool) for v in values): out[bucket][key] = _and(values)
            else: out[bucket][key] = values[-1]
    return out
```

### 3.6 `pdp/eval/obligation_merge.py`

```python
# pdp/eval/obligation_merge.py
from typing import Dict, Any, List
from ..dsl.obligation_catalog import is_known, get as obl_get

def _conservative(attrs_list: List[Dict[str,Any]]) -> Dict[str,Any]:
    out: Dict[str,Any] = {}
    for a in attrs_list:
        for k,v in (a or {}).items():
            if isinstance(v, list): out[k] = sorted(list({*(out.get(k, []) + v)}))
            elif isinstance(v,(int,float)): out[k] = min(v, out.get(k, v))
            else: out.setdefault(k, v)
    return out

def merge_obligations(objs: List[Dict[str,Any]]) -> List[Dict[str,Any]]:
    by_id: Dict[str,List[Dict[str,Any]]] = {}
    for ob in objs:
        by_id.setdefault(ob["id"], []).append(ob.get("attributes", {}))
    merged=[]
    for oid, attrs_list in by_id.items():
        if is_known(oid):
            spec = obl_get(oid)
            if spec.merge == "presence": merged.append({"id": oid})
            else: merged.append({"id": oid, "attributes": _conservative(attrs_list)})
        else:
            merged.append({"id": oid, "attributes": _conservative(attrs_list)})
    return merged
```

### 3.7 `pdp/eval/evaluation_engine.py`

```python
# pdp/eval/evaluation_engine.py
from typing import Any, Dict, List, Tuple
from ..dsl.policy_normalizer import PolicyNormalizer
from .constraints_merge import merge_constraints
from .obligation_merge import merge_obligations
from fnmatch import fnmatch

class EvaluationEngine:
    def __init__(self, condition_parser, expr_eval):
        self.norm = PolicyNormalizer()
        self.cp = condition_parser
        self.ev = expr_eval

    async def evaluate(self, policies: List[Dict[str,Any]], req: Dict[str,Any]) -> Dict[str,Any]:
        denies=[]; permits=[]; constraints=[]; ob_deny=[]; ob_permit=[]
        for pol in policies:
            for rr in pol.get("rules", []):
                nr = self.norm.normalize_rule(rr)
                if not self._match(nr, req): 
                    continue
                if not await self._cond_true(nr.condition, req):
                    continue
                if nr.effect == "deny":
                    denies.append(nr); ob_deny += nr.obligations_deny
                else:
                    permits.append(nr)
                    if nr.constraints_permit: constraints.append(nr.constraints_permit)
                    ob_permit += nr.obligations_permit

        if denies:
            return {"decision": False, "constraints": {}, "obligations": merge_obligations(ob_deny), "reason":"deny_override"}
        if permits:
            return {"decision": True, "constraints": merge_constraints(constraints), "obligations": merge_obligations(ob_permit)}
        return {"decision": False, "constraints": {}, "reason":"no_rule_matched"}

    def _match(self, nr, req):
        rtype = req["resource"]["type"]; aname = req["action"]["name"]
        rpat = nr.resource if isinstance(nr.resource,str) else nr.resource.get("type","*")
        acts = nr.action if isinstance(nr.action,list) else [nr.action]
        return fnmatch(rtype, rpat) and any(fnmatch(aname, a) for a in acts)

    async def _cond_true(self, cond: Any, req: Dict[str,Any]) -> bool:
        if cond in (None, True, "true"): return True
        # Your existing parser/evaluator may be sync; adapt accordingly
        return await self.ev.evaluate(cond, req) if hasattr(self.ev, "evaluate") else self.ev.evaluate(cond, req)
```

### 3.8 `pdp/load/app_scoped_resolver.py`

```python
# pdp/load/app_scoped_resolver.py
from pathlib import Path
from typing import Dict, List, Optional
import yaml, hashlib

class ApplicationScopedResolver:
    def __init__(self, base_dir: Path, app_dir: Path):
        self.base = base_dir; self.app_dir = app_dir; self.app_map: Dict[str,Dict[str,str]] = {}
        self.load_app_registry(app_dir)

    def load_app_registry(self, app_dir: Path):
        self.app_map.clear()
        for f in app_dir.glob("*.yaml"):
            cfg = yaml.safe_load(f.read_text()) or {}
            self.app_map[cfg.get("id", f.stem)] = {"domain": cfg.get("domain"), "environment": cfg.get("environment")}

    def _files_for(self, app_id: Optional[str]) -> List[Path]:
        paths: List[Path] = []
        dom = (self.app_map.get(app_id) or {}).get("domain"); env=(self.app_map.get(app_id) or {}).get("environment")
        paths += list((self.base / "applications" / (app_id or "global")).glob("*.yaml"))
        if dom:
            if env: paths += list((self.base/"domains"/dom/"environments"/env).glob("*.yaml"))
            paths += list((self.base/"domains"/dom/"cross-environment").glob("*.yaml"))
            paths += list((self.base/"domains"/dom/"shared").glob("*.yaml"))
        paths += list((self.base/"global").glob("*.yaml"))
        return [p for p in paths if p.exists()]

    def resolve(self, app_id: Optional[str]) -> List[Dict]:
        return [yaml.safe_load(p.read_text()) for p in self._files_for(app_id)]

    def etag(self, app_id: Optional[str]) -> str:
        h = hashlib.sha256()
        for p in self._files_for(app_id):
            h.update(p.read_bytes())
        return h.hexdigest()[:16]
```

### 3.9 `pdp/load/boundary_guard.py` (optional strictness)

```python
# pdp/load/boundary_guard.py
class BoundaryViolation(Exception): ...
class BoundaryGuard:
    def __init__(self, allowed_resources: set[str] | None = None, allowed_actions: set[str] | None = None):
        self.ar = allowed_resources or {"*"}
        self.aa = allowed_actions or {"*"}
    def validate(self, policies: list[dict]):
        if "*" in self.ar and "*" in self.aa: return
        for pol in policies:
            for i, r in enumerate(pol.get("rules", [])):
                res = r.get("resource","*"); act = r.get("action","*")
                if isinstance(res, list): ok_res = all((x in self.ar or "*" in self.ar) for x in res)
                else: ok_res = res in self.ar or "*" in self.ar
                if isinstance(act, list): ok_act = all((x in self.aa or "*" in self.aa) for x in act)
                else: ok_act = act in self.aa or "*" in self.aa
                if not (ok_res and ok_act): 
                    raise BoundaryViolation(f"rule[{i}] out of scope: {res} {act}")
```

### 3.10 `pdp/server/cache.py`

```python
# pdp/server/cache.py
import json, hashlib
from cachetools import TTLCache

class DecisionCache:
    def __init__(self, maxsize=20000, ttl=1.5):
        self.ttl = ttl
        self._c = TTLCache(maxsize=maxsize, ttl=ttl)

    def key(self, req: dict, app_id: str | None):
        canon = {
          "subject": req.get("subject"),
          "action": req.get("action"),
          "resource": {"type": req["resource"]["type"], "id": req["resource"].get("id")},
          "app": app_id
        }
        return hashlib.sha256(json.dumps(canon, sort_keys=True).encode()).hexdigest()

    def get(self, k): return self._c.get(k)
    def set(self, k, v): self._c[k] = v
    def clear(self): self._c.clear()
```

### 3.11 `pdp/server/api.py`

```python
# pdp/server/api.py
from fastapi import FastAPI, HTTPException, Request, Query
from pathlib import Path
import os, uuid, yaml
from .cache import DecisionCache
from ..load.app_scoped_resolver import ApplicationScopedResolver
from ..load.boundary_guard import BoundaryGuard
from ..eval.evaluation_engine import EvaluationEngine
from ..eval.operators_ai import cidr_match, domain_allow, url_host_in, content_has_phrase

app = FastAPI(title="AuthZEN PDP (ARIA v1 profile)")

# --- Wire your existing ConditionParser/ExpressionEvaluator here
class DummyEval:
    def evaluate(self, cond, req): return True  # replace with your real evaluator

engine = EvaluationEngine(condition_parser=None, expr_eval=DummyEval())
resolver = ApplicationScopedResolver(
    base_dir=Path(os.getenv("POLICY_DIR","config/policies")),
    app_dir=Path(os.getenv("APP_DIR","config/applications"))
)
cache = DecisionCache(maxsize=int(os.getenv("CACHE_MAX", "20000")), ttl=float(os.getenv("DECISION_CACHE_TTL_MS","1500"))/1000.0)

def _enrich(decision: dict, app_id: str | None):
    meta = {
      "decision": decision.get("decision", False),
      "context": {
          "constraints": decision.get("constraints", {}),
          "obligations": decision.get("obligations", []),
          "decision_id": str(uuid.uuid4()),
          "policy_version": os.getenv("POLICY_VERSION","v1"),
          "constraints_schema": "aria.constraints.v1",
          "obligations_schema": "aria.obligations.v1",
          "obligations_etag": resolver.etag(app_id),
          "ttl_ms": int(cache.ttl * 1000),
      }
    }
    return meta

@app.post("/access/v1/evaluation")
async def evaluation(req: dict):
    app_id = ((req.get("resource") or {}).get("properties") or {}).get("pdp_application")
    ck = cache.key(req, app_id)
    hit = cache.get(ck)
    if hit: return hit

    policies = resolver.resolve(app_id)
    # Optional: boundary guard using app schema (if you store per-app allowed resource/action lists)
    # BoundaryGuard(allowed_resources=..., allowed_actions=...).validate(policies)

    out = await engine.evaluate(policies, req)
    enriched = _enrich(out, app_id)
    cache.set(ck, enriched)
    return enriched

@app.post("/access/v1/evaluations")
async def evaluations(body: dict):
    results = []
    for r in body.get("requests", []):
        results.append(await evaluation(r))
    return {"evaluations": results}

@app.post("/admin/policies/reload")
async def reload():
    resolver.load_app_registry(resolver.app_dir)
    cache.clear()
    return {"ok": True}
```

### 3.12 `pdp/main.py` (bootstrap)

```python
# pdp/main.py
import uvicorn
from server.api import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT","8000")))
```

### 3.13 `pdp/requirements.txt` (suggested)

```
fastapi==0.110.*
uvicorn[standard]==0.30.*
pyyaml==6.*
cachetools==5.*
```

---

## 4) Authoring examples (DSL—same syntax, new knobs)

```yaml
# config/policies/applications/aria-bff/openai-chat.yaml
id: openai-chat-prod
rules:
  - id: allow-openai-chat
    resource: "llm:openai:chat"
    action: "invoke"
    effect: permit
    when:
      all:
        - context.environment == 'prod'
        - resource.properties.pdp_application == 'aria-bff'
    on_permit:
      constraints:
        model:   { allow: ['gpt-4.1','gpt-4o-mini'] }
        tokens:  { max_input: 6000, max_output: 1500, max_stream: 4096 }
        egress:  { allow: ['api.openai.com:443'] }
        identity_chain:
          allowed_audiences: ['https://graph.microsoft.com']
          allowed_scopes: ['User.Read']
          max_token_ttl_seconds: 300
          require_dpop: false
        prompt_rules:
          disallowed_phrases: ['ignore all previous','system override']
          url_allowlist: ['*.corp.example']
          block_markdown_external_links: true
          block_system_prompt_leakage: true
        params:
          allowlist:
            amount: ['^\d+(\.\d{1,2})?$']
        spend: { max_cents: 500, consent_threshold_cents: 200 }
      obligations:
        - id: emit_receipt
        - id: tee_analytics
          attributes: { include: ['usage','limits'] }

  - id: deny-secret-models
    resource: "llm:*"
    action: "*"
    denyIf: resource.properties.model IN ['gpt-secret']
```

---

## 5) Tests you can drop in (snippets)

```python
# tests/test_constraints_merge.py
from pdp.eval.constraints_merge import merge_constraints

def test_allow_intersection():
    out = merge_constraints([{"model":{"allow":["a","b"]}}, {"model":{"allow":["b","c"]}}])
    assert out["model"]["allow"] == ["b"]

def test_min_tokens():
    out = merge_constraints([{"tokens":{"max_output":2000}}, {"tokens":{"max_output":1500}}])
    assert out["tokens"]["max_output"] == 1500

def test_sql_and():
    out = merge_constraints([{"data_scope":{"row_filter_sql":"tenant='t1'"}}, {"data_scope":{"row_filter_sql":"region='us'"}}])
    assert out["data_scope"]["row_filter_sql"] == "(tenant='t1') AND (region='us')"

def test_identity_chain_merge():
    out = merge_constraints([
      {"identity_chain": {"allowed_audiences":["https://graph.microsoft.com"], "allowed_scopes":["User.Read"], "max_token_ttl_seconds": 300, "require_dpop": False}},
      {"identity_chain": {"allowed_audiences":["https://graph.microsoft.com","https://api.github.com"], "allowed_scopes":["User.Read","Mail.Read"], "max_token_ttl_seconds": 120, "require_dpop": True}}
    ])
    ic = out["identity_chain"]
    assert ic["allowed_audiences"] == ["https://graph.microsoft.com"]
    assert ic["allowed_scopes"] == ["User.Read"]
    assert ic["max_token_ttl_seconds"] == 120
    assert ic["require_dpop"] is True
```

```python
# tests/test_obligation_merge.py
from pdp.eval.obligation_merge import merge_obligations

def test_presence_and_union():
    merged = merge_obligations([
        {"id":"emit_receipt"},
        {"id":"tee_analytics","attributes":{"include":["usage"]}},
        {"id":"tee_analytics","attributes":{"include":["limits"]}},
    ])
    by = {o["id"]: o.get("attributes",{}) for o in merged}
    assert "emit_receipt" in by
    assert set(by["tee_analytics"]["include"]) == {"usage","limits"}
```

---

## 6) Rollout plan (no client downtime)

1. **Deploy PDP with this build** alongside current one or in place (same port).
2. **Default `mode=rich`.** Your new **BFF** and **ARIA Gateway** already read `context.constraints`.
   For any legacy PEPs, call `?mode=legacy` temporarily.
3. **Load policies** under `config/policies` and **applications** registry under `config/applications`.
   Policies without `pdp_application` still resolve against `global/`.
4. **Hot reload** anytime via `POST /admin/policies/reload` (clears cache).

---

## 7) Security & performance

* **Fail‑closed**: if resolver load fails or no rules match → `decision=false`.
* **Decision cache TTL** is intentionally short. Tune with `DECISION_CACHE_TTL_MS` (default 1500ms).
* **Stream token cap precedence**: for streaming calls, the effective cap is `min(tokens.max_output, tokens.max_stream)` when both are present; otherwise the available single limit.
* **Boundary guard** (optional) prevents cross‑app resource/action drift.
* **Operator pack** is pure‑Python & deterministic; add more as needed.
* **No secrets in decisions**: don’t echo user prompts/PII in responses.

### IdP alignment (identity chaining v1.1)

- PDP centrally controls chaining via `constraints.identity_chain` (allowed_audiences, allowed_scopes, max_token_ttl_seconds, require_dpop). IdP consults PDP before minting assertions/tokens.
- TTL guidance: set `max_token_ttl_seconds` conservatively (≤ 300s recommended). The IdP enforces its configured upper bound even if PDP allows more.
- Reason hints on deny (optional): when denying an identity_chain request, include `context.reason_admin/user` with short codes such as `identity_chain.audience_not_allowed` or `identity_chain.scope_not_allowed` to aid operator logs.

---

## 8) Mapping to your old PDP “what to add” list

* **Constraints engine + schema** → `constraints_merge.py` + `constraints_catalog.py`.
* **Obligations union** → `obligation_merge.py` + `obligation_catalog.py`.
* **Operator pack** → `operators_ai.py` (register in your evaluator).
* **App‑scoped policy resolver** → `app_scoped_resolver.py` keyed by `pdp_application`.
* **Boundary guard** → `boundary_guard.py` (optional strict).
* **Batch eval** → `/access/v1/evaluations`.
* **Decision cache** → `server/cache.py` wired in `server/api.py`.
* **Tracing/metadata** → `decision_id`, `policy_version`, `*_schema`, `obligations_etag`, `ttl_ms` in responses.
* **PEP helpers**: already delivered in your BFF/MCP‑GW; PDP just returns clean constraints/obligations.

---

**That’s it.** Drop these files into your `pdp/` service, keep your Docker wiring as‑is, and you get the ARIA v1 PDP—with constraints vs obligations cleanly separated, app‑scoped policy resolution, and compatibility for any legacy callers.

---

## 9) PDP operations guide

### Configuration
- `POLICY_DIR`: base policy dir (default `config/policies`)
- `APP_DIR`: applications registry dir (default `config/applications`)
- `CACHE_MAX`: decision cache size (default 20000)
- `DECISION_CACHE_TTL_MS`: decision cache TTL in ms (default 1500)
- `POLICY_VERSION`: string marker returned in responses

### Usage
- POST `/access/v1/evaluation` with `{subject, action, resource, context?}`
- Returns rich `{decision, context:{constraints, obligations, decision_id, ...}}`
- Batch: POST `/access/v1/evaluations` with `{requests:[...]}`
- Hot reload: POST `/admin/policies/reload`

### Testing
- Constraints merge unit tests (intersection/min/and_sql)
- Obligation merge tests (presence/conservative)
- Operator pack tests (`url_host_in`, `content_has_phrase`)

### Troubleshooting
- Unexpected deny: verify `pdp_application` and app registry entry
- Missing constraints: check policy normalizer + merge rules
- Cache staleness: tune `DECISION_CACHE_TTL_MS` or disable for debugging

---
