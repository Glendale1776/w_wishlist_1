# UI/UX (brief.md)

## Experience goals
- Gifter can identify a viable gift action in under 60 seconds on mobile.
- Owner gets coordination signal without spoiler risk.
- First-run owner setup feels guided and complete.

## Core screens and behavior
- Auth + onboarding: show create-first-wishlist flow, add-first-item flow, and removable sample items.
- Owner list index: quick create, share-copy, status chips, and empty-state guidance.
- Owner editor: add/edit items, group-fund toggle, archive action, and status-safe progress indicators.
- Public share page: clean read-first page with clear availability/funding states and action CTAs.
- Item action modal: reserve/release and pledge input with 100-cent minimum and immediate feedback.
- Admin moderation: minimal table/detail flow for abuse reports and stale claim override.

## Surprise/privacy presentation
- Owner never sees reserver identity or contributor identity/amount rows.
- Owner sees only `Available/Reserved/Purchased` style state and funded progress bar.
- Public/gifter views can show coordination status needed to avoid duplicates.

## Interaction and states
- Tap targets are at least 44px for all primary item actions.
- Public actions trigger auth prompt and return user to original item context.
- Use skeletons for list and item loading.
- Use toasts for copy/reserve/release/contribute success.
- Error states show retry action and preserve previously loaded content.

## Accessibility and responsive rules
- Keyboard focus rings and semantic headings are required.
- WCAG AA contrast for text and controls.
- Mobile uses bottom sheets for secondary actions; desktop uses side drawers.
- Reduced-motion mode avoids celebratory animations.
