# Acceptance (brief.md)

## Product behavior
- Owner can create a wishlist and share a hard-to-guess public link.
- Public visitor can read list content without login.
- Public visitor attempting reserve/contribute is prompted to sign in and then returned to the same item action.
- Owner can add/edit/archive items; delete is blocked when claims/contributions exist.
- Group-funded item accepts multiple pledges and shows funded progress against target.

## Privacy and security
- Owner UI never exposes reserver identity.
- Owner UI never exposes contributor identity or per-contribution amounts.
- Share token is validated server-side using hashed token storage.
- RLS blocks cross-user writes and non-authorized reads.

## Data and validation
- All money values are stored in integer cents.
- Contribution below 100 cents is rejected server-side with `VALIDATION`.
- Reservation conflicts return `CONFLICT` without corrupting aggregate state.
- Reservation expiry defaults to 72 hours.

## Realtime and UX quality
- Reservation state changes propagate to active viewers without refresh.
- Contribution totals propagate to active viewers without refresh.
- Primary mobile actions have 44px minimum target.
- Loading uses skeletons; failures use inline error with retry.

## Ops and SEO
- Uploads over 10MB are rejected with clear client/server error.
- URL metadata fetch enforces 3–5s timeout and SSRF protection.
- Share pages emit canonical and OG/Twitter tags.
- Share pages default to `noindex`.

## Conflict notes
- NOTE: where design/technical options differ, behavior follows `docs/brief.md` decisions (2026-02-18).
