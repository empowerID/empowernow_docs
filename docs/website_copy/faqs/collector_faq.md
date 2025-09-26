# FAQ — Data Collector (Inventory & Usage)

## How fresh is the data?
Domain SLAs define freshness; deltas stream via Kafka into ClickHouse.

## What lineage is captured?
Source, transform, sink, timestamps, and integrity markers for each record.

## How does this connect to policy?
PDP PIP consumes inventory/usage views for accurate constraints and budget context.

## Can I export to my lakehouse?
Yes. Use scheduled exports or direct queries to ClickHouse for downstream models.

## What about cost to operate?
Models run on commodity infra; connectors batch efficiently; ClickHouse scales on read.

## See also
- `/docs/services/data-collector/index.md`
- `/docs/services/data-collector/explanation/lineage.md`
- `/docs/services/data-collector/explanation/freshness.md`
