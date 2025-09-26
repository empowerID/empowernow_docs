# FAQ — ARIA Shield (Zero‑Token SPA & AI Gateway)

## Why zero‑token SPA?
Removing tokens from the browser reduces breach risk; Shield manages tokens server‑side with httpOnly cookies.

## How do budgets work?
Budget holds occur on call start using `call_id`, settle on success, return 402 on exceed with clear UX.

## Can you cut a stream mid‑flight?
Yes. Streaming caps enforce token/output limits with policy‑driven warnings.

## Does this replace my API gateway?
It can sit behind or alongside; focus is application‑aware enforcement and SSE control.

## What providers are supported?
Multiple; constraints originate from PDP, not provider configs.

## See also
- `/docs/services/aria-shield/index.md`
- `/docs/services/aria-shield/explanation/zero-token.md`
- `/docs/services/aria-shield/explanation/budgets.md`
