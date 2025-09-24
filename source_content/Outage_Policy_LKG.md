# Outage Policy (Last-Known-Good)

## Purpose
Maintain limited availability during PDP outages by using time-bound cached allow decisions.

## Behavior
- Remember allow decisions keyed by subject/resource/action with TTL
- On PDP failure only (not deny), consult LKG; log usage
- Never override explicit denies

## Tuning
- Keep TTL short; track hit ratios; audit usage

## References
- `src/services/outage_policy.py`
