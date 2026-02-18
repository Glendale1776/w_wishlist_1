# Routes (brief.md)

## App routes (authenticated)
- `/auth`: email/password auth entry and return-to flow.
- `/app`: home with owner lists and quick actions.
- `/app/lists`: list index + create entry.
- `/app/lists/new`: create wishlist form.
- `/app/lists/[wishlistId]`: owner editor and status-safe overview.
- `/app/lists/[wishlistId]/edit`: list settings and share controls.
- `/app/admin/moderation`: admin abuse queue and stale-claim override.

## Public routes
- `/w/[shareToken]`: canonical share page for public viewing.
- `/w/[shareToken]?item=[itemId]`: deep-link to item action modal after auth.

## API routes
- `POST /api/w/[shareToken]/reserve`: create/update reservation.
- `POST /api/w/[shareToken]/release`: release caller reservation.
- `POST /api/w/[shareToken]/contribute`: create pledge contribution.
- `POST /api/w/[shareToken]/purchase`: mark caller claim purchased.
- `POST /api/metadata/fetch`: URL preview fetch with SSRF and timeout controls.
- `POST /api/admin/claims/[claimId]/override`: admin stale-claim clear + audit log.

## Route guards
- Public share page is readable without login.
- Reserve/contribute/purchase/release require authenticated user.
- Owner routes require wishlist ownership.
- Admin routes require admin role.

## Response contracts
- Success: return updated aggregate item state (`availability`, `funded_cents`, `target_cents`).
- Errors use typed codes only: `VALIDATION`, `AUTH`, `CONFLICT`, `RATE_LIMIT`, `INTERNAL`.
- Mutation endpoints require idempotency key header for duplicate-submit safety.

## SEO + metadata
- Share route sets canonical URL from `APP_BASE_URL` + token path.
- Share route includes OG/Twitter metadata.
- Share route default robots policy is `noindex`.
