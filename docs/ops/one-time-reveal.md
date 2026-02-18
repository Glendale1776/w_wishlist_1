# One-Time Reveal Workflow

## Purpose
- Share newly issued secrets once, with expiration and audit fields.

## CLI
- Issue: `node scripts/ops/one-time-reveal.mjs issue <label> <secret> <actor> [ttlSeconds]`
- Consume: `node scripts/ops/one-time-reveal.mjs consume <revealToken> <actor>`
- Self-test: `node scripts/ops/one-time-reveal.mjs self-test`

## Operating steps
- Issuer runs `issue` and sends only the reveal token to the recipient.
- Recipient runs `consume` once; second consume attempt is rejected.
- Issuer records the event in incident or deployment notes (label, actor, timestamps).
- Tokens must have short TTL (default 900s); expired tokens are re-issued, never extended.

## Self-test record
- Date: 2026-02-18
- Command: `node scripts/ops/one-time-reveal.mjs self-test`
- Result: `ok=true`, `onceOnly=true`, `consumedLabel=SUPABASE_SERVICE_ROLE_KEY`, `consumedBy=ops-self-test`.
