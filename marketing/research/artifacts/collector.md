# Data Collector — Artifacts Pack

## Freshness & Lineage Diagram
```mermaid
flowchart LR
  SRC[Sources] --> NORM[Normalization]
  NORM --> FRESH[Freshness SLA]
  FRESH --> LINE[Lineage]
  LINE --> GRAPH[Inventory Graph]
  GRAPH --> ANA[Analytics (ClickHouse/Kafka)]
```

## Links
- Shortlist: `marketing/research/shortlists/collector.md`
- SERP log: `marketing/research/serp/collector.csv`
- Competitors: `marketing/research/competitors/collector/`

## Velocity & Pricing Notes (snapshot)
- IGA suites: enterprise pricing; discovery/inventory bundled
- Adjacent pipelines (Cribl/Elastic): usage/tiered; ingest-first

## Analyst/Market Notes
- Policy accuracy depends on near-real-time freshness + lineage
- Inventory graph enables decision enrichment and audit joins

## Proof Hooks
- Freshness SLA counters (lag minutes) and lineage timestamps
- Receipt joins from PDP → Collector analytics (ClickHouse)
