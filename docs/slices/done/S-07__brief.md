status: done
id: S-07
topic: brief.md
title: Admin moderation and stale claim override
Preconditions (P0s): none
Changes: `/app/admin/moderation`; `/api/admin/claims/[claimId]/override`; abuse report queue UI; audit log wiring
Steps:
- Create admin-only moderation route and access guard.
- Add abuse report list with status filters.
- Add report detail view with hide/unhide actions.
- Add stale claim override action for blocked items.
- Require reason note for every override/hide action.
- Persist moderation actions to audit log.
- Show outcome toast and refresh aggregate state.
- Add tests for role guard and audit persistence.
Design focus:
- Admin actions are explicit and reversible where possible.
- Risky actions require confirmation and reason capture.
- Queue state is easy to scan and prioritize.
Tech focus:
- Admin guard blocks non-admin session access.
- Override endpoint validates target claim state.
- Every action writes immutable audit metadata.
- Response contract aligns with typed error model.
SQL?: none
Env?: none
Acceptance:
- Non-admin users cannot open moderation route.
- Admin can view abuse queue and inspect report detail.
- Admin can clear stale reservation with reason captured.
- Hide/unhide actions are logged with actor and timestamp.
- Override result updates item availability aggregates.
- Integration tests pass for auth and audit requirements.
Debts:
- Add bulk moderation actions later.
