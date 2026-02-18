status: done
id: S-01
topic: brief.md
title: Supabase schema and privacy-safe aggregates
Preconditions (P0s): none
Changes: schema for wishlists/items/claims/contributions/audit; RLS policies; aggregate views; realtime publications
Steps:
- Define base tables and columns from `docs/data_model.md`.
- Add unique hash storage for share tokens.
- Add constraints for cents fields and min contribution.
- Implement archive-only guard for in-flight items.
- Create owner-safe and public-safe aggregate views.
- Add RLS policies for owner/gifter/admin/public-token reads.
- Publish claim/contribution changes to realtime channels.
- Seed minimal fixture rows for integration tests.
Design focus:
- Owner-facing state reads as status/progress only.
- Public state labels are unambiguous for availability.
- No identity leakage in any aggregate payload.
Tech focus:
- RLS denies cross-tenant access by default.
- Constraints reject invalid monetary and state values.
- Realtime payloads stay aggregate-only.
- Query plan remains index-backed for list loads.
SQL?: create tables, constraints, indexes, views, RLS policies, realtime publication
Env?: none
Acceptance:
- Owner cannot query claimer identities through app APIs.
- Public token reads only allowed for share-safe projections.
- Contribution under 100 cents fails validation.
- Hard delete on item with history is blocked.
- Realtime event payload excludes user identifiers.
- Migration runs clean on empty and seeded DB.
Debts:
- Optional materialized view tuning may be needed after load testing.
