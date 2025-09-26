# Marketing Metrics Export

This folder defines the event schema and examples for exporting marketing/site events to BI tools.

## Flow

```mermaid
flowchart LR
  E[Site Events\n(CTAs, views, demos)] --> UTM[UTM Enrichment]
  UTM --> S[Schema Normalize]
  S --> J[JSONL Export]
  J --> B[BI (Looker/Grafana)]
```

## Event types (examples)

- page_view
- cta_click (soft|medium|hard)
- demo_start / demo_complete
- quickstart_click
- link_out

See `schema.json` for fields and `events.sample.jsonl` for examples.
