status: done
id: S-03
topic: brief.md
title: Public share page and auth-gated actions
Preconditions (P0s): none
Changes: `/w/[shareToken]` page; item modal/deep-link; auth gate redirect/return flow; realtime subscriptions
Steps:
- Build canonical public share route using token lookup.
- Render list hero, item feed, availability, and funded progress.
- Implement item action modal with deep-link support.
- Gate reserve/contribute actions behind sign-in.
- Return signed-in user to original item context.
- Subscribe page to realtime item/funding updates.
- Add noindex/canonical/OG metadata on share route.
- Add loading skeletons and retryable error cards.
Design focus:
- Gift action is discoverable in under 60 seconds.
- CTA labels are explicit for reserve vs contribute.
- Item status is readable at glance on phone.
- Success/error feedback is immediate and clear.
Tech focus:
- Token lookups are server-side and constant-time.
- Auth gate preserves intent across redirects.
- Realtime updates patch item cards without full refresh.
- SEO tags reflect `APP_BASE_URL`.
SQL?: none
Env?: `APP_BASE_URL` for canonical metadata output
Acceptance:
- Unauthenticated viewer can browse full shared list.
- Reserve/contribute action requires login and resumes context.
- Share page renders canonical + OG tags.
- Share page robots defaults to noindex.
- Reservation/funding changes appear live without manual refresh.
- Error card allows retry without losing loaded content.
Debts:
- Optional alternate slug route can be added later.
