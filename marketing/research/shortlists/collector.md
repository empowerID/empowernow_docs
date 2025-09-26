# Data Collector — Competitor Shortlist and SERP Seed

Focus: freshness SLAs, lineage, normalization, inventory graph, and analytics backbone (ClickHouse/Kafka).

## Shortlist
- SailPoint — discovery/inventory in IGA context
- Saviynt — governance analytics; discovery capabilities
- One Identity Manager — discovery/provisioning; governance focus
- Elastic/Beats + Logstash — data ingest (adjacent tooling)
- Cribl Stream — observability pipelines (adjacent)
- Snowflake/BigQuery — analytical sinks (adjacent)

## Diagram — Freshness & Lineage
```mermaid
flowchart LR
  SRC[Sources] --> NORM[Normalization]
  NORM --> FRESH[Freshness SLA]
  FRESH --> LINE[Lineage]
  LINE --> GRAPH[Inventory Graph]
  GRAPH --> ANA[Analytics (ClickHouse/Kafka)]
```

## Notes
- Competitors JSON: `marketing/research/competitors/collector/`
- SERP log: `marketing/research/serp/collector.csv`
