# Battlecard — IdP (Agent Passports)

## Positioning

Replace fragile API keys with purpose-bound, pairwise Agent Passports (OAuth TE + RAR + optional DPoP) so every human/agent call is provable and least‑privilege.

## Quick pitch

- Outcome: lower breach risk, faster audits, simpler integrations (standards).
- Moat: plan contracts + schema pins + chain-of-actors + receipts.

## Traps → Counters

- Trap: “We already have OAuth scopes.”
  - Counter: Scopes ≠ purpose-bound RAR; no plan, no pins, no receipts.
- Trap: “Keys in a vault are enough.”
  - Counter: Keys aren’t pairwise; no actor chains or proof-of-possession.
- Trap: “Delegation adds friction.”
  - Counter: Start with TE + pairwise; add chains/pins incrementally.

## Proof assets (show, don’t tell)

- Reference: `/docs/services/idp/index.md`
- Passports TE/RAR: `/docs/services/idp/reference/token-exchange.md`
- Receipts: `/docs/services/aria-shield/reference/receipts.md`

## Demo beats (3 minutes)

1) Replace a shared key with a Passport; show pairwise `sub`.
2) Delegated actor chain rendered; deny when RAR missing; permit → receipt.
3) Show plan/pin fields in the credential payload.

## Displacement plan

- Assess: keys in code/CI; shared tokens; lack of delegation.
- Pilot: 2 flows → TE + pairwise; week 2 add RAR; week 3 add chain.
- Success: zero shared keys; receipts in SIEM; no failed audits on delegation.

## Objection handling

- “Vendor lock-in?” → Open standards (RFC 8693/9396/9449) + portable receipts.
- “Latency?” → Passport mint is off critical path; PEP validation is cached.

## Pricing posture signals

- Drive on key-sprawl and audit time; ROI from breach reduction + audit prep.

## Visual (Mermaid)

```mermaid
flowchart LR
  U[User/Service]-->TE[Token Exchange]
  TE-->P[Agent Passport]
  P-->PEP[PEP (Shield/MCP)]
  PEP-->PDP
  PEP-->R[Receipt]
```
