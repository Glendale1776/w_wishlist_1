status: pending
id: S-04
topic: brief.md
title: Claim and contribution connector APIs
Preconditions (P0s): none
Changes: `/api/w/[shareToken]/reserve|release|purchase|contribute`; idempotency middleware; structured audit logging
Steps:
- Define request/response schemas for each mutation endpoint.
- Verify share-token access and user authentication context.
- Add idempotency-key handling for duplicate submits.
- Implement atomic reservation transitions and conflict checks.
- Implement contribution create with 100-cent minimum.
- Return updated aggregate item state on all mutations.
- Emit structured logs with correlation IDs and error type.
- Write endpoint integration tests for success/failure races.
Design focus:
- Error copy maps to actionable user choices.
- Conflict states explain why action failed.
- Success responses update UI with minimal latency.
Tech focus:
- Endpoint auth and token verification are mandatory.
- Mutations are transaction-safe against race conditions.
- Idempotency prevents duplicate writes on retries.
- Logs include actor, item, action, and result code.
SQL?: RPC/function for atomic claim upsert; transaction for contribution insert + aggregate recompute
Env?: none
Acceptance:
- Duplicate client submit with same idempotency key is single-write.
- Concurrent reserve attempts produce deterministic winner + conflict.
- Contribution below 100 cents returns `VALIDATION`.
- Mutation responses include fresh aggregate state for UI patching.
- Structured logs exist for success and failure paths.
- Endpoint tests cover auth, validation, conflict, and internal error mapping.
Debts:
- Add rate-limit telemetry dashboard in follow-up.
