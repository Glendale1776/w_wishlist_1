# Scope (brief.md)

- Topic: `brief.md`.
- Goal: ship a surprise-safe wishlist MVP where public viewers coordinate gifts without duplicates.

## In scope
- Email/password auth and first-run onboarding for owners.
- Owner can create multiple wishlists and manage items with URL, image, and price (cents).
- Public share link is hard-to-guess and viewable without login.
- Reserve and contribute flows require sign-in, then return to same item context.
- Real-time updates for reservation state and funded progress on public and owner views.
- Group-funded items support pledge contributions with server-side minimum of 100 cents.
- Items with reservation/contribution history are archive-only (no hard delete).
- Minimal admin operations: abuse handling + stale claim override with audit log.

## Constraints
- Surprise privacy: owner sees only availability/status + funded progress, never identities or per-contribution amounts.
- Supabase stack is required: Auth, Postgres, Storage, Realtime, RLS, hashed share tokens.
- Upload limits: 10MB max per file; URL metadata fetch timeout 3–5 seconds with SSRF guardrails.
- Error model: `VALIDATION | AUTH | CONFLICT | RATE_LIMIT | INTERNAL`.
- SEO level is basic: canonical + OG/Twitter metadata; share pages default `noindex` unless explicitly enabled.
- Retention default: claims/contributions/audit history retained for V1 operations.

## Out of scope (Later)
- Built-in payments/refunds/webhook reconciliation.
- Native mobile apps.
- Advanced moderation systems and recommendation features.
- Shipping/tracking workflows.

## Conflict notes
- NOTE: Technical baseline allows stricter owner hiding modes; resolved in favor of `docs/brief.md` status-only owner view (2026-02-18).
