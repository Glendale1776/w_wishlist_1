# Data Model (brief.md, Supabase=yes)

## Core tables
- `profiles`: `user_id`, `display_name`, `locale`, `currency`, `avatar_url`, timestamps.
- `wishlists`: `id`, `owner_id`, `title`, `occasion_name`, `occasion_date`, `note`, `visibility`, timestamps.
- `share_links`: `id`, `wishlist_id`, `token_hash` (unique), `revoked_at`, timestamps.
- `items`: `id`, `wishlist_id`, `title`, `source_url`, `image_url`, `price_cents`, `currency`, `group_funded`, `target_cents`, `archived_at`, timestamps.
- `claims`: `id`, `wishlist_id`, `item_id`, `claimer_user_id`, `state(reserved|purchased|cancelled)`, `quantity`, `expires_at`, timestamps.
- `contributions`: `id`, `wishlist_id`, `item_id`, `contributor_user_id`, `amount_cents`, timestamps.
- `audit_logs`: `id`, `actor_user_id`, `action`, `target_type`, `target_id`, `meta_json`, `created_at`.

## Derived read models
- `item_public_state_v`: `item_id`, `availability_state`, `reserved_qty`, `purchased_qty`, `funded_cents`, `target_cents`.
- `item_owner_state_v`: same as public state, excludes claimer/contributor identity fields.
- `item_contributor_history_v`: per-user pledge history for archived or active items.

## Required constraints
- Money fields are integer cents; `contributions.amount_cents >= 100`.
- `share_links.token_hash` must be unique and compared server-side only.
- Hard delete guard: reject item delete when related `claims` or `contributions` exist; require `archived_at` flow.
- Contribution updates recalculate funded totals against current `target_cents` without mutating historical rows.
- Reservation expiry default is 72h (configurable later).

## RLS + privacy rules
- Owner can read/write own wishlists/items and read only aggregate claim/contribution state.
- Public token route can read public-safe wishlist/item projections only.
- `claims` rows are writable/readable by claimer and admin; owner gets aggregate status only.
- `contributions` rows are writable/readable by contributor and admin; owner gets funded aggregate only.
- `audit_logs` are append-only; readable by owner/admin only.

## Realtime events
- Broadcast item availability changes from `claims` mutations.
- Broadcast funded progress changes from `contributions` mutations.
- Payloads for owner/public clients exclude identity fields.

## Conflict notes
- NOTE: `docs/technical.md` default surprise mode may hide owner claim status entirely; resolved in favor of `docs/brief.md` status-only owner view (2026-02-18).
