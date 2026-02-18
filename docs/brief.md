# brief.md

1) Owners share surprise-safe wishlists so friends reserve or pledge gifts in real time without duplicate buying.

2) People + pains
- Roles: Wishlist owner, Friend/gifter.
- Pain: Gift coordination in chat/spreadsheets causes duplicate purchases.
- Pain: Owners need surprise-safe progress without identity leaks.
- Pain: Expensive gifts need simple group pledges.

3) Top tasks
- Owner creates a wishlist with occasion info and a hard-to-guess public link.
- Owner adds/edits items (title, URL, price cents, image) and can mark group-funded targets.
- Gifter opens public view on mobile, sees live availability/progress, then signs in to reserve/contribute.
- Owner monitors reserved/available state plus funded progress only, then archives in-flight items safely.
- Admin handles abuse reports and stale claim overrides with audit records.

4) Data per task (persisted only)
- Create/manage wishlist: wishlist_id, owner_id, title, occasion_name, occasion_date, note, public_token_hash, visibility.
- Add/manage item: item_id, wishlist_id, title, source_url, image_url, price_cents, currency, group_funded, target_cents, archived_at.
- Reserve item: claim_id, item_id, claimer_user_id, state, quantity, created_at, updated_at.
- Contribute pledge: contribution_id, item_id, contributor_user_id, amount_cents, created_at.
- Safety/admin: audit_log_id, actor_user_id, action, target_type, target_id, created_at.

5) Screens
- Auth + onboarding: start account and first setup; email/password form, create-first-wishlist CTA, add-first-item CTA, sample-items action, empty-state illustration.
- Owner My Wishlists: manage all wishlists; list cards, create button, share-copy action, status chips, search/filter.
- Owner Wishlist Editor: edit list/items safely; add/edit drawer, group-fund toggle, archive action, share-link controls, live status view.
- Public Wishlist View: gift shopping without signup for read; hero summary, availability badges, funding bars, reserve/contribute CTAs, mobile-first item list.
- Item Action Modal: complete reserve/contribute flows; reserve/release controls, contribution amount input, $1 min validation, personal history, success/error toast.
- Admin Moderation (Admin): minimal support flow; abuse queue, report detail, hide/unhide control, stale-claim override, audit note.

Must-haves vs Later
- Must-haves: email/password auth, public share token links, real-time updates, surprise privacy, group pledges, archive-not-delete safeguards, responsive public flow.
- Later: social login, built-in payments, refunds, shipping tracking, native apps, advanced moderation, recommendation features.

Flags
- Supabase: yes
- AdminArticles: no
- SEO: basic

Overrides
- Product: canonical URL uses production app base (`APP_BASE_URL`, default Vercel domain); locale default `en-US` with USD display; auth required for Reserve/Contribute; uploads include avatar/cover/item images.
- Product: SEO basics = canonical tags + OG/Twitter metadata on share pages, robots/sitemap for app routes, and public share pages default `noindex` until explicitly enabled.
- Design & UX: public list actions must be tappable (44px min) and a gifter should pick an item in under 60 seconds on mobile.
- Design & UX: onboarding must include a polished empty state with “Try with sample items” and removable sample data.
- Tech & Ops: APIs include public share read/reserve/contribute plus SSRF-safe metadata fetch; integrations are Supabase Auth/Postgres/Storage/Realtime with RLS and hashed share tokens; env vars include Supabase keys, `APP_BASE_URL`, metadata timeout, and email provider keys.
- Tech & Ops: limits are 10MB uploads and 3–5s metadata fetch timeout; roles are owner/gifter/admin; errors use `VALIDATION|AUTH|CONFLICT|RATE_LIMIT|INTERNAL`; retention keeps claims/contributions/audit history for V1; payment webhooks stay off in V1.

Refs:
- R-01
- R-02
- R-03

Decisions
- 2026-02-18: Owner visibility is status-only surprise mode (Reserved/Available + funded progress), with no reserver or contributor identity shown.
- 2026-02-18: Reserve/Contribute always requires authenticated sign-in after opening a public link; anonymous users are view-only.
- 2026-02-18: Contributions are pledge-only in V1 with minimum 100 cents and no in-app payment processing.
- 2026-02-18: Items with reservations or contributions cannot be hard-deleted; they must be archived with audit history.
- [P1] Q01 [T] canonical domain
  Problem: Final production domain unknown.
  Answer: We will use Vercel domain for this app.

- [P1] Q02 [F] reserve expiry
  Problem: Reservation expiry duration unspecified.
  Answer: Default to 72 hours and make it configurable later.

- [P1] Q03 [T] retention window
  Problem: Long-term retention duration unspecified.
  Answer: Keep audit and contribution history indefinitely for V1.
