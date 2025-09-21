

### Why ARIA BFF and MCP Gateway capture all AI traffic
- **In‑path proxies**: The ARIA BFF fronts all LLM requests (`/chat/completions`), and the MCP Gateway fronts agent‑to‑tool calls (`/mcp/{tool}`). Both terminate requests, authenticate, authorize via PDP, enforce constraints (egress, params, plan), then forward. Budget enforcement is BFF‑only.
- **Visibility with privacy**: They must read prompts/messages to preflight/mask and enforce policy. By default we persist only receipts (hashes/usage, no content). With explicit policy + consent, the BFF can journal masked prompts to Postgres+pgvector and emit sanitized events to Kafka/ClickHouse.
- **Enabler for value**: This choke‑point vantage enables skills coaching, reuse detection, risk analytics, automation recommendations, spend insights, and admin dashboards—without changing downstream tools/providers.

### Principles
- **Receipts as truth**: BFF/ARIA emit signed receipts; Analytics derives cost/usage.
- **Sanitized by default**: store masked prompts (post‑preflight redaction). Raw is opt‑in, KMS‑encrypted, and never sent to Kafka.
- **Separation of concerns**: Postgres (per‑user journaling + vector search), ClickHouse (aggregates/dashboards), Redis (hot counters/caches), Kafka (sanitized events to ClickHouse).
- **Fail‑secure**: journaling never blocks the allow/deny decision; no prompt content in logs/receipts.

## Architecture

```mermaid
graph TB
  subgraph Client
    UI["UI/Bot"]
    Manager["Manager dashboard"]
  end

  subgraph Control
    PDP["PDP (constraints/obligations)"]
    RV["Receipt Vault (sign+hash)"]
  end

  subgraph DataPlane
    BFF["BFF (/chat/completions)"]
    Provider["LLM Provider"]
  end

  subgraph DataStores
    PG["Postgres + pgvector (Prompt Journal)"]
    CH["ClickHouse (OLAP)"]
    R["Redis (hot state)"]
    K["Kafka (sanitized events)"]
  end

  UI -->|/chat| BFF -->|evaluate| PDP
  BFF -->|provider call| Provider
  BFF -->|receipt| RV

  BFF -->|POST masked transcript| PG
  PG -->|produce sanitized event| K
  K -->|Kafka Engine| CH

  RV -->|optional JWS fan-out| K
  R <--> BFF
  Manager -->|dashboards| CH
```

### AI Spend integration (implemented)
- BFF passes `provider`, `model`, and optional `category` to PDP; accepts `X-Category` header or body field and sets `x-category-mode=inline|lazy`.
- MCP Gateway derives `category` from tool registry tags (e.g., `category: dev`) and forwards `provider/model/category` to PDP.
- Category precedence: `header > registry tag > ML proposer` (when enabled). ML runs only when `category` is absent or `x-category-mode=lazy`.
- PDP enforces overall/provider/model/category budgets via Analytics BudgetState PIP; denies map to HTTP 402. When `category_pending=true`, PDP skips category-scoped budgets (or treats as `uncategorized`) per policy flag.
- Receipts include `category`, `category_pending`, `proposed_category` and, when available, `proposed_category_confidence` (0..1) and `proposed_category_source` (`ml|header|registry`).
- Pending attribution default: attribute spend to `uncategorized` until an admin applies a category; a config knob can switch to proposed-category attribution if desired.
- Visual Designer SPA exposes AI Spend pages (User, Manager, Admin) consuming Analytics endpoints with conditional GET + SWR.

#### AI Spend at a glance (Mermaid)
```mermaid
flowchart LR
  UI-->BFF
  Agent-->MCP
  BFF-->PDP
  MCP-->PDP
  BFF-->Analytics
  MCP-->Analytics
  Analytics<-->Redis
```

### Request flow

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant B as BFF
  participant P as PDP
  participant O as Provider
  participant R as ReceiptVault
  participant PG as Postgres(pgvector)
  participant K as Kafka
  participant CH as ClickHouse
  participant RD as Redis

  C->>B: POST /chat/completions (messages)
  B->>P: PDP evaluate (constraints)
  P-->>B: Allow + constraints
  B->>B: Preflight (mask, clamp, egress)
  alt journaling policy+consent ok
    B->>PG: upsert masked transcript (conv, msgs)
    PG-->>B: ack
    PG-->>K: sanitized event (async)
    K-->>CH: materialized view ingest
  end
  B->>O: provider call (stream/non-stream)
  O-->>B: response (+usage)
  B->>R: sign receipt (Allow + usage)
  R-->>B: {jws, hash}
  B-->>C: response (SSE/JSON)
```

### Classification proposer (advisory)

- Optional, low-latency ML classifier (e.g., DistilBERT, ONNX-quantized) proposes a category when missing or when `x-category-mode=lazy`.
- Runs over masked text only by default; in Balanced/Raw modes, proposals may use approved raw fragments per policy.
- Timeboxed (e.g., 20–30 ms); on timeout or low confidence, keep `category_pending=true` and surface `proposed_category` with `proposed_category_confidence`.
- Fields added to `policy_snapshot` in receipts: `category_pending`, `proposed_category`, `proposed_category_confidence`, `proposed_category_source`.
- Note on export scoping: the BFF classifier can restrict which labels are exported to PDP via `policy_export.labels_allowlist`. Only allowlisted labels appear as `context.category_*` for policy/budgeting. Align this list with the categories you intend to attribute in Analytics. See `ms_bff_spike/docs/bff_ai_prompt_classifier.md`.

## Data contracts

- **PromptJournal API (BFF → Journal)**
  - `POST /journal/v1/transcripts:upsert`:
    - Body: `{ conversation_id, tenant_id, agent_id, user_id, model, decision_id?, messages: [{role, content_masked, content_sha256, created_at}], stream: bool }`
    - Response: `{ ok: true, persisted: n }`
- **Kafka topic: prompt_journal.sanitized.v1**
  - Key: `tenant_id:user_id:conversation_id`
  - Value: `{ ts, tenant_id, user_id, conversation_id, message_id, role, content_masked, content_sha256, token_estimate, model }`
  - Note: no raw content, no secrets; masked only.
- **Receipts**: unchanged (JWS) with additional optional fields under `policy_snapshot` for categorization: `category`, `category_pending`, `proposed_category`, `proposed_category_confidence`, `proposed_category_source`. Optional mirroring to `receipts.jws.v1` for offline pipelines; not required.

## Storage model

### Postgres + pgvector (system of record)

Database isolation (v1):
- Use a dedicated database `prompt_journal` on the shared Postgres server; do not reuse CRUDService's `workflow_db`.
- Configure the DSN via `PROMPT_JOURNAL_DSN` (e.g., `postgresql://<user>:<pass>@<host>:5432/prompt_journal`).
- Enable pgvector in that database: `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;`.

Minimal v1 implementation (as shipped now):
- Start with `pj_messages` only (UUID PK, tenant_id, subject_id, mode, content/raw fields, metadata, created_at) to land raw writes safely.
- Large raw payloads (>1MB) are gzip+base64 encoded and stored as `raw_payload_gzip_base64` with `payload_encoding`, `payload_original_len`, and `payload_compressed_len` metadata.
- Sanitized-only events continue to Kafka → ClickHouse unchanged.

- Store conversations/messages with masked content by default.
- Optional raw storage: envelope‑encrypted with KMS; column is `bytea` or external blob ref.
- Embeddings computed server‑side for masked content; pgvector index for semantic search.

SQL (DDL):
```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Conversations
CREATE TABLE pj_conversations (
  conversation_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,      -- canonical ARN
  user_id TEXT NOT NULL,       -- canonical ARN
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE pj_messages (
  message_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES pj_conversations(conversation_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content_masked TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  raw_encrypted BYTEA,    -- optional, null unless explicit consent
  token_estimate INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embeddings (masked content only)
-- Choose dimension per model; 1536 shown as example
CREATE TABLE pj_message_embeddings (
  message_id UUID PRIMARY KEY REFERENCES pj_messages(message_id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL
);

-- Vector index (HNSW recommended)
CREATE INDEX ON pj_message_embeddings USING hnsw (embedding);

-- Coach notes
CREATE TABLE pj_coach_notes (
  note_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_date DATE NOT NULL,
  summary TEXT NOT NULL,
  tips JSONB NOT NULL,
  skills JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_date)
);
```

Vector search (example):
```sql
-- Top-5 similar masked prompts for reuse/dedupe
SELECT m.message_id, m.content_masked, m.created_at
FROM pj_message_embeddings e
JOIN pj_messages m ON m.message_id = e.message_id
WHERE m.tenant_id = $1
ORDER BY e.embedding <-> $2::vector
LIMIT 5;
```

### ClickHouse (OLAP, high‑volume analytics)

- Ingest sanitized prompt events via Kafka Engine + Materialized View.
- Store denormalized rows for dashboards and manager reports.

ClickHouse DDL:
```sql
-- Kafka ingestion of sanitized events
CREATE TABLE prompts_kafka (
  ts DateTime64(3),
  tenant_id String,
  user_id String,
  conversation_id UUID,
  message_id UUID,
  role LowCardinality(String),
  content_masked String,
  content_sha256 FixedString(64),
  token_estimate Int32,
  model LowCardinality(String)
) ENGINE = Kafka
SETTINGS
  kafka_broker_list = 'kafka:9092',
  kafka_topic_list = 'prompt_journal.sanitized.v1',
  kafka_group_name = 'ch_prompts_g1',
  kafka_format = 'JSONEachRow',
  input_format_skip_unknown_fields = 1,
  kafka_num_consumers = 4,
  kafka_commit_every_batch = 1,
  kafka_thread_per_consumer = 1;

-- Target MergeTree table
CREATE TABLE prompts (
  ts DateTime64(3),
  tenant_id String,
  user_id String,
  conversation_id UUID,
  message_id UUID,
  role LowCardinality(String),
  content_masked String,
  content_sha256 FixedString(64),
  token_estimate Int32,
  model LowCardinality(String)
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (tenant_id, user_id, ts)
TTL ts + INTERVAL 180 DAY DELETE;

-- Materialized view to land data
CREATE MATERIALIZED VIEW prompts_mv TO prompts AS
SELECT *
FROM prompts_kafka;
```

Example manager KPI query:
```sql
-- Top recurring intents by masked content hash in last 7 days
SELECT tenant_id, count() AS uses, anyHeavy(model) AS model
FROM prompts
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY tenant_id, content_sha256
ORDER BY uses DESC
LIMIT 50;
```

### Redis (hot state)

- `bff:receipt:last:{agent}`: last receipt hash (already used).
- `bff:budget:{agent}` and holds: as designed.
- New (optional):
  - `pj:coach:last:{user}`: timestamp of last coach note.
  - `pj:convo:last:{user}`: last N conversation IDs (LRU) for quick lookups.

### Kafka (sanitized only)

- `prompt_journal.sanitized.v1`: masked prompt events produced by Prompt Journal after DB commit.
- Optional: `receipts.jws.v1` (JWS) if you want an offline mirror; primary path can stay HTTP→Analytics.

## BFF touchpoints (example code)

- After preflight masking and consent check, send masked transcript to Prompt Journal over HTTP.
- Non‑blocking; failures do not affect the main request.

```python
# bff/journal_client.py
import httpx, os, uuid, asyncio
JOURNAL_URL = os.getenv("PROMPT_JOURNAL_URL", "http://prompt-journal:8091")

async def upsert_transcript(conversation_id, tenant_id, agent_id, user_id, model, messages, decision_id=None, stream=False):
    payload = {
        "conversation_id": str(conversation_id),
        "tenant_id": tenant_id,
        "agent_id": agent_id,
        "user_id": user_id,
        "model": model,
        "decision_id": decision_id,
        "stream": bool(stream),
        "messages": [
            {
              "message_id": str(uuid.uuid4()),
              "role": m["role"],
              "content_masked": m["content_masked"],
              "content_sha256": m["content_sha256"],
              "created_at": m.get("created_at")
            } for m in messages
        ]
    }
    async with httpx.AsyncClient(timeout=2.0) as cli:
        r = await cli.post(f"{JOURNAL_URL}/journal/v1/transcripts:upsert", json=payload)
        r.raise_for_status()
        return r.json()

# In bff/app.py, after ENF.preflight(...)
if constraints.get("prompt_archive", {}).get("enabled") and headers.get("X-Prompt-Archive-Consent") == "yes":
    masked_msgs = [{"role": r["role"], "content_masked": r["content"], "content_sha256": sha256(r["content"])} for r in pf["messages"] if r.get("role") == "user"]
    asyncio.create_task(upsert_transcript(conv_id, tenant_id, agent_id, user_id, model, masked_msgs, ctx.get("decision_id"), stream=stream))
```

## Prompt Journal service (example)

- FastAPI app; writes masked messages to Postgres; computes embeddings; then enqueues sanitized events to an outbox table for reliable publishing to Kafka.
- In production, prefer outbox → Kafka worker (or Kafka transactions) over fire-and-forget tasks after DB commit.

```python
# prompt_journal/app.py
import os, uuid, asyncio, json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncpg
from aiokafka import AIOKafkaProducer  # replace with enterprise client in prod
from datetime import datetime
from sentence_transformers import SentenceTransformer

PG_DSN = os.getenv("PG_DSN", "postgresql://app:pass@postgres:5432/app")
KAFKA = os.getenv("KAFKA_BROKERS", "kafka:9092")
TOPIC = "prompt_journal.sanitized.v1"

app = FastAPI(title="Prompt Journal")
state = {"pg": None, "kafka": None, "embed": None}

class MsgIn(BaseModel):
    message_id: str | None = None
    role: str
    content_masked: str
    content_sha256: str
    created_at: str | None = None

class TranscriptIn(BaseModel):
    conversation_id: str
    tenant_id: str
    agent_id: str
    user_id: str
    model: str
    decision_id: str | None = None
    stream: bool = False
    messages: list[MsgIn]

@app.on_event("startup")
async def start():
    state["pg"] = await asyncpg.create_pool(PG_DSN, min_size=1, max_size=5)
    state["kafka"] = AIOKafkaProducer(bootstrap_servers=KAFKA)
    await state["kafka"].start()
    state["embed"] = SentenceTransformer(os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2"))

@app.on_event("shutdown")
async def stop():
    if state["kafka"]:
        await state["kafka"].stop()
    if state["pg"]:
        await state["pg"].close()

@app.post("/journal/v1/transcripts:upsert")
async def upsert_transcript(body: TranscriptIn):
    conv_id = body.conversation_id
    async with state["pg"].acquire() as conn:
        async with conn.transaction():
            await conn.execute("""
              INSERT INTO pj_conversations (conversation_id, tenant_id, agent_id, user_id, model)
              VALUES ($1,$2,$3,$4,$5)
              ON CONFLICT (conversation_id) DO NOTHING
            """, conv_id, body.tenant_id, body.agent_id, body.user_id, body.model)

            rows = []
            for m in body.messages:
                mid = m.message_id or str(uuid.uuid4())
                ts = m.created_at or datetime.utcnow().isoformat()
                await conn.execute("""
                  INSERT INTO pj_messages (message_id, conversation_id, role, content_masked, content_sha256, token_estimate, created_at)
                  VALUES ($1,$2,$3,$4,$5,NULL,$6)
                  ON CONFLICT (message_id) DO NOTHING
                """, mid, conv_id, m.role, m.content_masked, m.content_sha256, ts)

                # embedding for masked content
                vec = state["embed"].encode(m.content_masked, normalize_embeddings=True).tolist()
                await conn.execute("""
                  INSERT INTO pj_message_embeddings (message_id, embedding)
                  VALUES ($1, $2)
                  ON CONFLICT (message_id) DO UPDATE SET embedding = EXCLUDED.embedding
                """, mid, vec)
                rows.append((mid, m.role, m.content_masked, m.content_sha256, ts))

    # (outbox pattern recommended) enqueue for background publisher:
    # await conn.execute("""
    #   INSERT INTO pj_outbox(topic, key, payload)
    #   VALUES($1,$2,$3)
    # """, TOPIC, f"{body.tenant_id}:{body.user_id}:{conv_id}", json.dumps(msg))

    return {"ok": True, "persisted": len(rows)}
```

Notes:
- Replace AIOKafkaProducer with your enterprise Kafka client; keep topic/schema unchanged.
- Embedding model is swappable; dimension must match pgvector table.

## Daily “AI coach” job (example)

- Periodic worker fetches yesterday’s prompts per user from Postgres, calls the provider via BFF (so PDP/budget/receipts apply), stores a coach note.

```python
# coach_job/main.py
import os, asyncio, httpx, datetime, uuid, asyncpg
PG_DSN = os.getenv("PG_DSN")
BFF_URL = os.getenv("BFF_URL","http://bff:8083")

async def run_for_user(conn, user_id: str):
    rows = await conn.fetch("""
      SELECT content_masked FROM pj_messages m
      JOIN pj_conversations c USING (conversation_id)
      WHERE c.user_id = $1 AND m.created_at >= (now() - interval '1 day')
      ORDER BY m.created_at
    """, user_id)
    if not rows: return
    prompt = "Analyze these prompts and provide feedback, tips, and a 3-step learning plan:\n\n" + "\n---\n".join(r["content_masked"] for r in rows)
    async with httpx.AsyncClient(timeout=60) as cli:
        resp = await cli.post(f"{BFF_URL}/chat/completions", json={"model":"gpt-4o-mini","messages":[{"role":"user","content":prompt}],"stream": False})
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
    await conn.execute("""
      INSERT INTO pj_coach_notes (note_id, user_id, period_date, summary, tips, skills)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (user_id, period_date) DO UPDATE SET summary=$4, tips=$5, skills=$6
    """, str(uuid.uuid4()), user_id, datetime.date.today().isoformat(), content, '[]', '[]')

async def main():
    pool = await asyncpg.create_pool(PG_DSN)
    async with pool.acquire() as conn:
        users = await conn.fetch("SELECT DISTINCT user_id FROM pj_conversations")
        await asyncio.gather(*(run_for_user(conn, u["user_id"]) for u in users))

if __name__ == "__main__":
    asyncio.run(main())
```

## Risk scanning and reuse/dedupe

- Risk scanner: simple classifier (regex + LLM call via BFF) attaches tags to `pj_messages` (a `risk_tags JSONB` column).
- Reuse detection: vector nearest‑neighbors in Postgres, or hashed content clustering in ClickHouse. Recommend:
  - Real‑time dedupe for a user: pgvector KNN query (fast enough).
  - Fleet‑level “already solved” surfacing: ClickHouse top‑N by `content_sha256` and time windows.

## Security and privacy
- Default masked storage; raw requires explicit opt‑in and KMS encryption; raw never leaves Postgres.
- No prompt bodies in logs/receipts; Kafka carries sanitized content only.
- RBAC for reads on Prompt Journal; tenant scoping on all queries.
- Retention policies: e.g., masked prompts 90 days; coach notes 180 days; raw 14 days max (if enabled).

## Observability
- BFF metrics: `bff_prompt_archive_total{mode,result}`, `bff_llm_calls_total{mode,result}`, `bff_llm_budget_denied_total`.
- Journal metrics: `pj_events_persisted_total`, `pj_kafka_publish_total{result}`.
- ClickHouse ingestion: monitor Kafka consumer lag; `system.kafka_consumers` and row counts.

## Why this is “best fit” for your stack
- Postgres+pgvector provides strict governance, deletes, and user‑level search without pushing sensitive text to OLAP.
- ClickHouse ingests sanitized events at scale for fleet analytics and manager dashboards.
- Kafka decouples OLAP ingestion and future real‑time apps; events are sanitized to avoid leaking secrets.
- Redis continues to serve hot budgets/receipts/tips caches without mixing long‑term data.

- Summary:
  - Designed an opt‑in, privacy‑first journaling pipeline: BFF → Prompt Journal (Postgres+pgvector) → Kafka (sanitized) → ClickHouse, with Redis for hot state.
  - Provided concrete DDL for Postgres and ClickHouse, plus example FastAPI services for journaling and a daily coach job.
  - Kept receipts as system‑of‑record; avoided raw prompts on Kafka; ensured PDP/budget/receipts remain unchanged.

  ### Overview
- **Data sources**: Prompt Journal in Postgres+pgvector (masked prompts as system of record), ClickHouse (sanitized OLAP), Redis (hot state), Receipts (JWS) for cost/usage, Kafka for sanitized fan‑out to ClickHouse using the enterprise client [[memory:5121963]].
- **Identity**: Use canonical ARNs for `user_id`/`agent_id` (`auth:account:{provider}:{subject}`) everywhere [[memory:6099867]].
- **Delivery**: Use SSE for user/manager updates (no polling) [[memory:6208976]].

### Use cases
- Daily AI coach (per user)
- Skill scoring and progress over time
- Risk/banned‑activity detection and escalation
- Reuse/duplication detection (RAG assist)
- Goal inference and automation recommendations (tools/agents)
- Manager dashboards and team benchmarks
- Spend/efficiency and anomaly detection
- Model routing guidance

---

### 1) Daily AI coach (per user)
- Purpose: Feedback, tips, micro‑lessons from yesterday’s prompts.
- Inputs: `pj_messages` (PG), embeddings; provider completion via BFF.
- Outputs: `pj_coach_notes` (PG), SSE to user.
- **Problem it solves**: Inconsistent prompting and lack of feedback slow adoption and reduce outcome quality.
- **Potential market value**: Measurable skill uplift and faster time‑to‑value; defensible per‑seat “AI coach” add‑on.

```mermaid
sequenceDiagram
  autonumber
  participant W as Coach Worker
  participant PG as Postgres (pj)
  participant B as BFF
  participant L as LLM Provider
  participant U as UI (SSE)

  W->>PG: Select yesterday's masked prompts per user
  W->>B: POST /chat/completions (analysis prompt)
  B->>L: Provider call
  L-->>B: JSON (usage)
  B-->>W: Analysis text
  W->>PG: UPSERT coach note (summary, tips, skills)
  PG-->>U: SSE notify "coach:note:ready"
```

Sample query and API:
```sql
-- Yesterday’s prompts for a user
SELECT m.content_masked
FROM pj_messages m
JOIN pj_conversations c USING (conversation_id)
WHERE c.user_id = $1
  AND m.created_at >= now() - interval '1 day'
ORDER BY m.created_at;
```

```python
# GET /journal/v1/coach/{user_id}/latest
# Returns {period_date, summary, tips[], skills[]}
```

---

### 2) Skill scoring and progress
- Purpose: Quantify usage quality and growth.
- Inputs: PG prompts; CH aggregates for volume; simple rubric scoring (LLM or rules).
- Outputs: `pj_skill_scores(user_id, period, rubric_scores JSONB)`.
- **Problem it solves**: No objective proficiency signal or training ROI measurement for AI programs.
- **Potential market value**: Targets enablement spend; supports renewals/expansion with quantified progress.

ClickHouse rollups:
```sql
-- Daily prompt volume and avg token estimate (if provided)
SELECT toDate(ts) AS d, tenant_id, user_id,
       count() AS msgs, avgOrNull(token_estimate) AS avg_toks
FROM prompts
GROUP BY d, tenant_id, user_id
ORDER BY d DESC;
```

PG scoring storage:
```sql
CREATE TABLE pj_skill_scores (
  user_id TEXT NOT NULL,
  period_date DATE NOT NULL,
  rubric_scores JSONB NOT NULL,  -- e.g., {"clarity":0.7,"context":0.6,"iteration":0.8}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, period_date)
);
```

---

### 3) Risk/banned activity detection
- Purpose: Detect unsafe or prohibited intents.
- Inputs: PG (masked content), optional LLM classifier via BFF.
- Outputs: `pj_messages.risk_tags JSONB`, CH counters, manager alerts.
- **Problem it solves**: Early detection and evidence of non‑compliant behavior without storing sensitive content.
- **Potential market value**: Lowers regulatory/reputational risk; aligns with security/compliance budgets.

Flow:
```mermaid
flowchart LR
  PG[pj_messages] --> RS["Risk Scanner (rules+LLM)"]
  RS -->|tag| PG
  RS -->|sanitized event| Kafka
  Kafka --> CH[ClickHouse]
```

ClickHouse monitoring:
```sql
-- Top risk tags daily
SELECT toDate(ts) AS d, tenant_id, tag, count() AS hits
FROM
(
  SELECT ts, tenant_id,
         JSONExtractStringArray(tags, 'tag') AS t
  FROM prompts -- if tags are emitted with events
)
ARRAY JOIN t AS tag
GROUP BY d, tenant_id, tag
ORDER BY d DESC, hits DESC;
```

---

### 4) Reuse/duplication detection (RAG assist)
- Purpose: Surface “already solved” threads and relevant prior answers.
- Inputs: pgvector KNN; CH trending duplicates by `content_sha256`.
- Outputs: Inline suggestions; links to similar threads/answers.
- **Problem it solves**: Duplicated work and token waste from repeatedly solving similar tasks.
- **Potential market value**: Cost savings and productivity lift; smoother knowledge reuse story.

PG KNN:
```sql
-- k-NN within tenant for reuse
SELECT m.message_id, m.content_masked, m.created_at
FROM pj_message_embeddings e
JOIN pj_messages m USING (message_id)
JOIN pj_conversations c USING (conversation_id)
WHERE c.tenant_id = $1
ORDER BY e.embedding <-> $2::vector
LIMIT 5;
```

ClickHouse fleet trend:
```sql
-- Frequent duplicates in last 14 days (by masked hash)
SELECT content_sha256, tenant_id, count() AS uses
FROM prompts
WHERE ts >= now() - INTERVAL 14 DAY
GROUP BY content_sha256, tenant_id
ORDER BY uses DESC
LIMIT 100;
```

---

### 5) Goal inference and automation recommendations
- Purpose: Infer end goals; propose tools/agents that automate the work.
- Inputs: PG masked prompts; Tool Registry capabilities; CH clusters.
- Outputs: Recommendations referencing Tool Registry IDs.
- **Problem it solves**: Manual repetition of workflows that existing agents/tools could automate.
- **Potential market value**: Converts usage into durable automation (stickiness); upsell to agents/tool bundles.

```mermaid
flowchart LR
  PG["pj_messages + embeddings"] --> CL["Clustering (periodic)"]
  CL --> GI["Goal Inference via BFF/LLM"]
  GI --> MAP["Map to Tool Registry capabilities"]
  MAP --> REC["Recommendations saved per user/team"]
```

Mapping sketch:
```python
# For each cluster summary, map keywords to tool capabilities
tool_caps = registry.list_caps()  # mcp:* ids
matches = [cap for cap in tool_caps if cap in summary_keywords]
# store recommendation: {cluster_id, tool_id, rationale}
```

---

### 6) Manager dashboards and team benchmarks
- Purpose: Usage, risk, reuse, coaching coverage.
- Inputs: ClickHouse (`prompts`, optional `receipts` mirror), PG notes.
- Charts:
  - Prompts/day by team, risk tag counts, reuse hits, coach coverage (% of users with notes), cost by model (from receipts).
- **Problem it solves**: Lack of visibility into adoption, risk posture, and ROI at the team/tenant level.
- **Potential market value**: Executive‑ready reporting; de‑risks rollout and strengthens renewal cases.

ClickHouse examples:
```sql
-- Prompts per user last 7 days
SELECT toDate(ts) d, tenant_id, user_id, count() AS prompts
FROM prompts
WHERE ts >= now() - INTERVAL 7 DAY
GROUP BY d, tenant_id, user_id
ORDER BY d, tenant_id, prompts DESC;

-- Cost by model (if receipts mirrored to CH)
SELECT toDate(ts) d, resource_id AS model, sum(cost_usd) usd
FROM receipts
WHERE resource_type = 'model'
GROUP BY d, model
ORDER BY d, usd DESC;
```

---

### 7) Spend/efficiency and anomaly detection
- Purpose: Catch overspend or unusual behavior early.
- Inputs: Receipts (cost), Redis hot state for tripwires, CH for trends.
- Outputs: Alerts, throttles (policy), manager notifications.
- **Problem it solves**: Surprise bills and uncontrolled costs undermine trust and adoption.
- **Potential market value**: Cost control and predictability; enables chargeback/showback and budgeting.

CH anomaly baseline:
```sql
-- Z-score style anomaly on daily cost per user (simple)
WITH
  grp AS (
    SELECT toDate(ts) d, tenant_id, user_id, sum(cost_usd) usd
    FROM receipts
    GROUP BY d, tenant_id, user_id
  )
SELECT *,
       (usd - avg(usd) OVER (PARTITION BY tenant_id, user_id ORDER BY d ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING))
       /
       nullIf(stddevPop(usd) OVER (PARTITION BY tenant_id, user_id ORDER BY d ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING),0) AS z
FROM grp
ORDER BY d DESC
LIMIT 200;
```

---

### 8) Model routing guidance
- Purpose: Suggest cheaper/safer models based on prompt patterns and outcomes.
- Inputs: CH cost by model; PG features (length, risk tags).
- Output: Policy hints or recommendations to PDP admins.
- **Problem it solves**: Over‑reliance on premium models and inconsistent safety posture.
- **Potential market value**: Material cost reductions with preserved quality; policy‑driven multi‑model ROI.

CH cost efficiency:
```sql
-- Cost per output token by model (requires receipts usage)
SELECT toDate(ts) d, resource_id AS model,
       sum(cost_usd) / nullIf(sum(output_tokens),0) AS usd_per_out_token
FROM receipts
WHERE resource_type='model'
GROUP BY d, model
ORDER BY d DESC;
```

---

### APIs (selected)
- User:
  - `GET /journal/v1/coach/{user_id}/latest` → latest coach note
  - `GET /journal/v1/search?query=...` → pgvector semantic search (masked)
  - SSE: `/journal/v1/stream` → coach updates, risk notices [[memory:6208976]]
- Manager:
  - `GET /journal/v1/manager/{tenant}/kpis?range=7d` → CH aggregates
  - `GET /journal/v1/manager/{tenant}/risks?range=7d`
  - `GET /journal/v1/recommendations/{tenant}` → tool/agent recs
- Governance:
  - `PUT /journal/v1/consent` (per user/tenant)
  - `DELETE /journal/v1/user/{user_id}` (data rights)

---

### Eventing and ingestion
- Prompt Journal emits sanitized events to Kafka after PG commit, using the enterprise Kafka client from `empowernow_common` [[memory:5121963]].
- ClickHouse ingests via Kafka Engine + materialized view (as designed).
- Receipts remain HTTP→Vault; Analytics can mirror to Kafka for CH if needed.

---

### Privacy and security
- Masked content by default; raw requires explicit consent, KMS envelope‑encrypted, never sent to Kafka/ClickHouse.
- No secrets/tokens in logs or receipts; events carry masked text and hashes only.
- RBAC and tenant scoping on all reads; retention policies (e.g., masked 90d, coach notes 180d, raw ≤14d).

---

### Example: real‑time user reuse hint (SSE)
```python
# journal/api.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
router = APIRouter()

@router.get("/journal/v1/stream")
async def stream(request: Request):
    async def gen():
        yield b"event: ping\ndata: ok\n\n"
        # On new message persisted: run KNN and push top-3
        # data: {"type":"reuse_suggestions","items":[...]}
    return StreamingResponse(gen(), media_type="text/event-stream")
```

---

- We defined eight concrete use cases with inputs/outputs, dataflows, queries, and APIs leveraging Postgres+pgvector (system of record), ClickHouse (OLAP), Redis (hot), and Kafka (sanitized fan‑out via empowernow_common [[memory:5121963]]). All user/manager notifications use SSE [[memory:6208976]], and all identities use canonical ARNs [[memory:6099867]].

# Design #2 More Robust

Below is a **final, production‑grade design** that supports **both sanitized and full‑fidelity (raw) journaling**. It keeps your “receipts as truth” posture, ties decisions to **constraints vs. obligations**, and uses your existing **IdP ↔ PDP ↔ PEP** patterns with **RAR / Token Exchange / AuthZEN / MCP**. I’ve included concrete data models, policies, APIs, and enforcement logic showing how to switch between modes per **tenant / user / agent / conversation / message**—with safe defaults that remain privacy‑first.

> Why this aligns with ARIA: your white paper formalizes *constraints (synchronous allow/deny)* and *obligations (asynchronous must‑dos)* and shows how IdP+PDP+PEP cooperate under RAR/Token‑Exchange/AuthZEN/MCP. We reuse that exact split to drive journaling mode and consent, not just spend limits.&#x20;

---

## 0) TL;DR

* **Three privacy modes** you can toggle at run‑time via **policy** and **user/tenant consent**:

  1. **Strict (Sanitized)** – mask before store; no raw leaves app memory.
  2. **Balanced (Field‑Level Raw)** – store masked + *select raw fields* encrypted; allow redaction on read.
  3. **Full‑Fidelity (Raw)** – store full prompt/response encrypted at rest; governed by short retention, DLP gates, and narrow RBAC.
* Mode is selected by **PDP obligations** and **RAR “purpose”**; enforced by **IdP PEP** (during token mint) and **BFF/ARIA PEPs** (during request).
* **Postgres+pgvector** remains the **system of record**; **ClickHouse** stays the OLAP plane. Kafka carries **sanitized** by default; raw has a **separate, quarantined path** (or bypasses Kafka entirely).
* **Consent** is a first‑class obligation: step‑up proof can be required **inline** during OBO/RAR issuance or **just‑in‑time** mid‑conversation.

---

## 1) Privacy modes & when to use them

| Mode                           | What we store                                                                    | Recommended for                               | Trade‑off                                                        |
| ------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| **Strict (Sanitized)**         | Masked text + hashes + embeddings of masked text                                 | Highly regulated tenants; default             | Best privacy, weakest downstream analytics/RAG                   |
| **Balanced (Field‑Level Raw)** | Masked text + *select raw fields* (encrypted) + raw embeddings from those fields | Most enterprise teams                         | Stronger analytics (intents, entity quality) with contained risk |
| **Full‑Fidelity (Raw)**        | Full prompt/response (envelope‑encrypted), embeddings from raw                   | Power users, model‑routing R\&D, quality labs | Strongest features (RAG, reuse, QA), highest governance burden   |

**How it is chosen (no code change in apps):**

* **RAR** carries `purpose` & journaling hints (`journal.mode=sanitized|balanced|raw`, `retention=14d`, etc.).
* **PDP decision** returns:

  * **constraints**: `prompt_archive: { mode, retention_days, pii_guard: { allow_raw_when: … } }`
  * **obligations**: `user_consent`, `dlp_scan`, `approval_required`, `notify`, etc.
* **PEPs** (IdP for token issuance; ARIA/BFF for runtime) enforce constraints synchronously and execute obligations asynchronously—exactly as in your white paper’s *constraints vs. obligations* model.&#x20;

---

## 2) Big picture (with dual pipelines)

```mermaid
graph TB
  subgraph Control
    PDP["PDP (AuthZEN)"]
    IdP["IdP PEP (OBO/RAR + obligations)"]
    RV["Receipt Vault (JWS + hash chain)"]
  end

  subgraph DataPlane
    BFF["LLM BFF (PEP)"]
    ARIA["ARIA Gateway (MCP PEP)"]
    Provider["LLM Provider"]
    Tools["MCP Tools/APIs"]
  end

  subgraph Stores
    PG["Postgres + pgvector (system of record)"]
    Vault["KMS/HSM (per-tenant keys)"]
    K["Kafka (sanitized topic)"]
    CH["ClickHouse (OLAP)"]
    OBJ["Object Storage (raw enclave, optional Iceberg/Delta)"]
  end

  BFF -->|AuthZEN evaluate| PDP
  ARIA -->|AuthZEN evaluate| PDP
  IdP -->|"Token Exchange - RAR"| BFF
  BFF --> Provider
  ARIA --> Tools
  BFF --> RV
  ARIA --> RV

  %% Dual journaling
  BFF -->|Journal API| PG
  ARIA -->|Journal API| PG
  PG -->|sanitized events| K 
  K --> CH
  PG -->|raw blobs ref| OBJ
  PG --> Vault
```

* **Sanitized** always flows PG → Kafka → ClickHouse.
* **Raw** never goes to Kafka/ClickHouse by default; it is persisted in **PG (encrypted)** or **object storage** with row‑level pointers in PG.

---

## 3) Governance guarantees (raw‑mode safety rails)

1. **KMS per tenant** (optional per user/agent) and **envelope encryption** for raw fields/blobs.
2. **Retention by policy** (14–30 days typical), **server‑side re‑encryption** on key rotation, cryptographic **shredding** on delete.
3. **Access segmentation**: only specific roles (e.g., *AI Quality*, *Security*, *DSAR Operator*) can read raw; product UIs default to masked.
4. **DLP gates** (obligation): new raw writes are scanned; if high‑risk finding → auto‑mask fields or require manager approval before commit.
5. **Purpose limitation**: RAR `purpose` + PDP policy require explicit purposes (e.g., `training`, `quality`, `root_cause`) for raw; audits verify purpose.
6. **Receipts as truth**: every decision/result still anchored in the Receipt Vault with policy snapshot and prev‑hash chain.&#x20;
7. **Continuous authorization**: CAEP/RISC signals reduce privileges (e.g., flip to *sanitized‑only*) on risk, budget depletion, anomalies.&#x20;

---

## 4) Data model (adds for dual‑mode)

**Postgres (selected columns; new highlighted)**

```sql
CREATE TABLE pj_conversations (
  conversation_id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  model TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'sanitized', -- 'sanitized'|'balanced'|'raw'
  purpose TEXT,                            -- from RAR
  consent_tx_id TEXT,                      -- proof reference
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pj_messages (
  message_id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES pj_conversations ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content_masked TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  -- NEW: field-level raw (encrypted)
  raw_fragments JSONB,           -- optional: {"subject":"<enc_blob_ref>","amount":"<enc>"} 
  raw_blob_ref TEXT,             -- optional: pointer to OBJ (s3://…/blob) if full body stored
  enc_key_ref TEXT,              -- tenant/user key id in KMS
  dlp_findings JSONB,            -- [{"type":"PCI","severity":"high","locations":[...]}]
  pii_tags TEXT[] DEFAULT '{}',  -- fast filter for access decisions
  token_estimate INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- masked embeddings as before + OPTIONAL raw embeddings (separate table)
CREATE TABLE pj_message_embeddings_raw (
  message_id UUID PRIMARY KEY REFERENCES pj_messages ON DELETE CASCADE,
  embedding vector(1536) NOT NULL
);
```

**ClickHouse** remains **sanitized** only (unchanged). If a tenant insists on OLAP over raw, deploy a **separate CH cluster** and **raw topic** with strict ACLs and shorter TTLs.

---

## 5) Policy & obligations that drive mode selection

**RAR example (agent asks for raw journaling on a specific purpose)**

```json
[
  {
    "type": "urn:aria:params:authorization-details:ai:agent",
    "tools": ["mcp:crm:lookup","mcp:email:send"],
    "purpose": "quality_root_cause",
    "constraints": { "budget_usd_max": 25 },
    "journal": { "mode": "raw", "retention_days": 21 }
  }
]
```

**PDP YAML (sugar‑DSL snippet)**

```yaml
policy: "journal_mode_selection.v1"
when:
  subject.type == "agent"
  and context.purpose in ["quality_root_cause","training_evaluation"]
then:
  permit:
    constraints:
      prompt_archive:
        mode: "{{ request.authorization_details.journal.mode or 'balanced' }}"
        retention_days: "{{ min(request.authorization_details.journal.retention_days or 21, 30) }}"
        pii_guard:
          allow_raw_when:
            - tenant.risk_tier in ['low','medium']
            - actor.trust_score >= 0.85
            - dlp.max_severity <= 'medium'
    obligations:
      - id: "require_user_consent"
        attributes:
          scopes: ["archive:raw"]
          display_text: "Allow storing raw prompts for 21 days for quality analysis?"
          ttl_seconds: 300
      - id: "dlp_scan_before_commit"
      - id: "notify_data_steward"
        attributes: { threshold: "high_risk" }
```

> **Fit to ARIA model:** constraints are synchronous (mode, retention, pii\_guard), obligations are post‑decision (collect consent, run DLP, notify)—as in the white paper’s separation.&#x20;

---

## 6) IdP PEP (OBO/RAR) and runtime PEPs (BFF/ARIA)

### 6.1 IdP PEP — consent at issuance time

* If PDP returns `require_user_consent`, the **IdP** pauses token exchange flow, drives a short **JARM** approval screen, and **only mints OBO** after success. (You already do this pattern for step‑up; same control plane, new UI string.)
* On success, the IdP embeds the **mode + retention** inside `aria_extensions` (or `authorization_details`) so every PEP sees the decision.

**JWT excerpt (ARIA Passport)**

```json
{
  "authorization_details": [
    {
      "type": "urn:aria:params:authorization-details:ai:agent",
      "tools": ["mcp:crm:lookup"],
      "journal": { "mode": "raw", "retention_days": 21 },
      "purpose": "quality_root_cause"
    }
  ],
  "aria_extensions": {
    "prompt_archive": { "mode": "raw", "retention_days": 21, "consent_tx_id": "txn-abc123" }
  }
}
```

### 6.2 BFF / ARIA PEP — consent mid‑conversation

* If the agent later escalates (e.g., switches to `raw` mid‑thread), the PEP reads PDP obligations for **just‑in‑time consent** and presents the same UI (inline modal or out‑of‑band link). On **deny**, the PEP **downgrades to sanitized** or **fails closed**, per constraint.

**Mermaid — runtime branch**

```mermaid
sequenceDiagram
  autonumber
  participant AG as Agent
  participant PEP as BFF/ARIA (PEP)
  participant PDP as PDP
  participant IdP as IdP (Consent UI)
  participant PG as Journal

  AG->>PEP: Invoke tool/chat (wants journal=raw)
  PEP->>PDP: evaluate(subject, resource, ctx)
  PDP-->>PEP: Permit + constraints(prompt_archive=raw) + obligations(consent, dlp)
  alt consent not cached
    PEP->>IdP: Start consent flow (JARM)
    IdP-->>PEP: consent=granted (tx_id)
  else consent denied/expired
    PEP-->>AG: 403 or downgrade to sanitized (per constraint)
  end
  PEP->>PG: write masked + raw (enc) per mode, with consent_tx_id
  PEP-->>AG: proceed with normal flow
```

---

## 7) Journal service behavior by mode

1. **Sanitized**:

   * Persist masked text, masked embeddings.
   * Emit sanitized Kafka event → ClickHouse.
   * No raw fields stored; any attempt to include raw is dropped.

2. **Balanced**:

   * Persist masked text + **selected raw fields** (`raw_fragments`), each envelope‑encrypted with tenant key.
   * Optional **raw embeddings** only from approved fragments.
   * Kafka/CH still receive sanitized only.

3. **Raw**:

   * Persist full prompt/response as an **encrypted blob** in object storage; store pointer in PG (`raw_blob_ref`) and **row hash**.
   * Optionally compute **raw embeddings** for better RAG.
   * Kafka/CH still sanitized unless explicitly allowed in policy to mirror to a **raw cluster**.

**Write‑time gates (sync):**

* Enforce retention window, max size, allowed mime types.
* DLP scan; if violating `pii_guard`, auto‑mask fields or **flip mode** to balanced.

---

## 8) APIs & headers (what changes at the edges)

**Agent → BFF** (or UI → BFF):

* Header `X-ARIA-Journal-Mode: sanitized|balanced|raw` (optional hint; actual mode is policy‑driven).
* Header `X-ARIA-Consent-Proof: jws` (optional if consent was pre‑granted at IdP).
* PEP reconciles hints with **PDP constraints** and **consent cache**.

**Journal API (BFF/ARIA → Journal)**

```http
POST /journal/v1/transcripts:upsert
{
  "conversation_id": "uuid",
  "tenant_id": "t1",
  "agent_id": "agent:svc:...:pairwise",
  "user_id": "auth:account:...",
  "model": "gpt-4o-mini",
  "mode": "raw|balanced|sanitized",
  "purpose": "quality_root_cause",
  "consent_tx_id": "txn-abc123",
  "messages": [
    {
      "role": "user",
      "content_masked": "...",
      "content_sha256": "...",
      "raw_fragments": { "subject": "<enc_ref>" },     // balanced
      "raw_blob_ref": "s3://bucket/key",               // raw
      "enc_key_ref": "kms:tenant:t1:key-2025-08",
      "dlp_findings": [{ "type":"PCI","severity":"low"}]
    }
  ]
}
```

---

## 9) Example enforcement code (PEP sketch)

```python
# pseudo inside BFF/ARIA
decision = await pdp.evaluate(...)
cons = decision["context"]["constraints"]
obl  = decision["context"]["obligations"]

mode = cons.get("prompt_archive", {}).get("mode", "sanitized")
retention = cons["prompt_archive"].get("retention_days", 14)

if any(o["id"] == "require_user_consent" for o in obl):
    proof = headers.get("X-ARIA-Consent-Proof")
    if not proof or not await idp.verify_consent(proof):
        proof = await idp.collect_consent(interactive=True)   # JARM round-trip
        if not proof:  # deny or downgrade per policy
            if mode == "raw":
                mode = "sanitized" if cons["prompt_archive"].get("allow_downgrade") else None
            if not mode: raise HTTPException(403, "consent_required")

# DLP (pre-commit obligation)
if any(o["id"] == "dlp_scan_before_commit" for o in obl) and mode in ("balanced","raw"):
    findings = await dlp.scan(body_text)
    if high_risk(findings) and not cons["prompt_archive"]["pii_guard"]["allow_raw_when"]:
        mode = "sanitized"

await journal.upsert(..., mode=mode, consent_tx_id=proof.id, ...)
```

---

## 10) Why **raw** materially strengthens features

* **RAG & reuse**: embeddings from raw content dramatically improve **similarity search** and “already answered” surfacing; masked text often erases intent‑critical tokens (IDs, product names).
* **Quality & safety**: full examples enable precise **hallucination detection**, **prompt anti‑patterns** mining, and **guardrail tuning**.
* **Routing**: granular model selection (cost vs. quality) benefits from accurate **length, structure, domain entity** signals.
* **Coaching**: personalized tips and micro‑lessons improve when the system sees the real task wording.

---

## 11) Risk & compliance (how we keep auditors onside)

* **Purpose binding** (RAR + policy) and **consent artifacts** recorded.
* **Access reviews**: monthly attestation for roles with raw read scope.
* **DSAR/Right to be Forgotten**: wipe raw blobs & re‑index embeddings (store `(message_id, chunk_hash)` to target deletes fast).
* **Receipts**: journal mode, retention, consent\_tx\_id included in **Receipt Vault** payload snapshot for reproducibility (fits your receipt model).&#x20;
* **Continuous authorization**: CAEP/RISC signals can *flip tenants to sanitized‑only*, reduce retention, or quarantine a conversation instantly.&#x20;

---

## 12) Rollout plan (safe & incremental)

1. **Default = Sanitized** (what you ship today).
2. Enable **Balanced** for a few low‑risk tenants; measure feature lift (RAG hit‑rate, reuse %, routing accuracy).
3. Pilot **Raw** behind consent + short retention (≤14–21 days), DLP required, narrow RBAC.
4. If outcomes justify, allow **Raw‑to‑OLAP** in a **separate ClickHouse cluster** with strict controls.

**KPIs to watch:** reuse hit‑rate, time‑to‑answer, cost per solved task, hallucination rate, consent opt‑in %, DLP violations, DSAR SLA.

---

## 13) Where this plugs back into ARIA (standards)

* **RAR** expresses journaling **purpose + mode** alongside capabilities.
* **Token Exchange (OBO)** binds user↔agent (pairwise) and carries the policy result as claims.
* **AuthZEN** request/response carries this as **constraints** (mode/retention) and **obligations** (consent, DLP, notify).
* **MCP**: tools remain unchanged; journaling is orthogonal to tool execution.
* This matches the *standards integration architecture* in your paper (RAR, 8693, AuthZEN, MCP).&#x20;

---

## 14) Optional: Balanced‑mode field catalog (what raw you keep)

Define an **allow‑catalog** per domain:

* **Sales ops**: `account_name`, `opportunity_id`, `amount`, `close_date`
* **Support**: `ticket_id`, `product_sku`, `error_code`
* **Travel**: `origin`, `destination`, `dates`, `airline`, `price`

These are stored as **encrypted fragments** (JSONB + key ref) and are enough to power **routing**, **reuse**, **dedupe**, **goal inference**—with far less risk than full raw.

---

## 15) Summary

* You keep your privacy‑first default.
* When customers accept it (and policy says it’s safe), **raw unlocks major feature lift**.
* The switch is **policy‑driven** and **obligation‑enforced** across IdP and runtime PEPs—exactly how ARIA separates **constraints vs. obligations** and runs at machine speed with compliance guarantees.&#x20;

If you want, I can translate this into a short **policy pack + FastAPI stubs** (Journal write gates, IdP consent UI mock, DLP hook) matching your repo layout.
