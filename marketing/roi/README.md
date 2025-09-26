# ROI/TCO Models

Each product uses the shared `roi.schema.json`. Models are JSON-only and feed the calculator UI.

```mermaid
flowchart LR
  U[Inputs per product] --> M[ROI Model JSON]
  M --> E[Engine (shared formulas)]
  E --> O[Outputs: spend_saved, audit_hours_saved, risk_reduction_pct, tco_12m, tco_36m, payback_months]
```

Notes:
- Keep inputs observable and defensible; store ranges and defaults.
- Document assumptions explicitly; attach evidence links where available.
