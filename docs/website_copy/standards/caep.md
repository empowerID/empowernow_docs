# What is CAEP (Continuous Access Evaluation Protocol)?

CAEP describes patterns for near-real-time signals and policy reevaluation so access can adapt to changes (e.g., device posture, risk) without waiting for token expiry.

## Why it matters
- Faster risk response than static token lifetimes
- Foundation for event-driven access decisions

## How it works (high-level)
- Systems emit and subscribe to security/identity signals
- Policies reevaluate on new signals; enforcement adapts

## Key terms
- Shared Signals, event-driven policy, continuous evaluation

## Common pitfalls
- Missing signal normalization and governance; blind spots in event coverage

## Next steps
- Events/Kafka how-to: `services/bff/how-to/events-kafka-caep.md`
- Observability reference: `services/bff/reference/observability.md`
