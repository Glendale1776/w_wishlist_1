# Support Playbook

## Correlation ID policy
- Every API request can carry `x-correlation-id`; if missing, server generates one.
- Support must request correlation ID before deep debugging incidents.
- Incident notes must include: correlation ID, endpoint, user role, UTC timestamp.

## Severity routing
- P0: auth failure across all reserve/contribute endpoints or leaked secret suspicion.
- P1: repeated `CONFLICT` or `VALIDATION` blocking normal user flow.
- P2: isolated user issue with workaround available.

## Triage map
- Reserve/purchase conflicts: inspect `/api/w/[shareToken]/*` mutation logs for `result=error` and `code=CONFLICT`.
- Contribution rejected: check payload amount and expect `VALIDATION` for values below 100 cents.
- Upload failures: verify MIME + size and signed URL expiry state.
- Metadata fetch failures: confirm URL is public and not blocked by SSRF rules.

## Pledge dispute flow
- Gather item ID, user ID, and correlation IDs from both sides.
- Confirm mutation order and idempotency-key replay behavior in logs.
- If incorrect state persists, raise P1 and include exact mutation timeline.

## Stale claim flow
- Confirm whether claim owner can still release or mark purchased.
- If blocked and event is time-critical, escalate to admin override path (S-07 flow).
- Record resolution and whether expiry defaults need adjustment.

## Delivery/support handoff
- For email auth errors, verify `EMAIL_PROVIDER_KEY` rotation status and deployment timestamp.
- Include delivery provider message ID and correlation ID in handoff notes.
