status: done
id: S-02
topic: brief.md
title: Owner onboarding and wishlist editor
Preconditions (P0s): none
Changes: `/auth`, `/app`, `/app/lists`, `/app/lists/new`, `/app/lists/[wishlistId]`; onboarding components; item editor UI
Steps:
- Build auth entry with return-to support.
- Add first-run empty state with sample item insertion.
- Implement create-wishlist form with occasion fields.
- Implement owner list index with share-copy affordance.
- Implement item create/edit drawer with URL/manual input paths.
- Add group-fund toggle and target input in cents.
- Add archive action and block hard delete in UI.
- Show owner-safe status and funded progress only.
Design focus:
- First-run flow is obvious and low-friction.
- Empty state is polished and removable.
- Owner status language avoids spoiler details.
- Primary actions remain visible on mobile.
Tech focus:
- Form validation matches server constraints.
- URL/manual item mode uses shared field model.
- Share-copy feedback uses deterministic toast state.
- Owner views consume aggregate-only endpoints.
SQL?: none
Env?: none
Acceptance:
- New owner can create first wishlist in one guided flow.
- Sample items can be added and removed safely.
- Owner can create/edit/archive item without identity leaks.
- Group-funded target persists and renders in owner view.
- Delete option is unavailable when item has claim/fund history.
- All primary actions are reachable on mobile layout.
Debts:
- Optional keyboard shortcuts can be added later.
