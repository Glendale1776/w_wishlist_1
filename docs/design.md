# design.md — Wish List Web App (Machine-readable)

<!--
CONSUMER: ChatGPT Pro
PURPOSE: UI/UX + layout specification for a shareable Wish List web app (Birthday/New Year/any occasion).
STACK: Next.js (Vercel) + Supabase (Auth/Postgres/Storage/Realtime).
PARSING RULES:
- Treat MUST/SHOULD/MAY as RFC 2119 requirements.
- Sections named: FOUNDATIONS / NAVIGATION / PATTERNS / SCREENS / COMPONENTS / STATES / RESPONSIVE / ACCESSIBILITY.
- Screen blocks are authoritative. Prefer reuse of COMPONENT blocks over inventing new UI.
- Do NOT add new features unless explicitly marked as OPTIONAL.
-->

---

## META

- PRODUCT_NAME: Wish List
- SPEC_VERSION: 1.0
- PLATFORMS: [web, mobile_web]
- PRIMARY_ROLES:
  - ROLE_OWNER: creates & shares lists
  - ROLE_GIFTER: shops/claims items from others’ lists
  - ROLE_GUEST: optional lightweight gifter without full account
- PRIMARY_GOAL: reduce duplicate gifts while preserving surprise; single share link per list

---

## FOUNDATIONS

### Product principles (non-negotiable)

- MUST provide a **public share link** per list that opens a clean “shop this list” view.
- MUST support **claiming** (reserve/purchased) to prevent duplicates.
- MUST preserve **surprise**: list owner must not see *who* is buying items; configure whether the owner sees claim status at all.
- MUST support “any store” items (URL-based items + manual items).
- MUST prioritize **fast scanning**: gift-givers should choose a gift in < 60 seconds on mobile.

### Visual direction (design-neutral, implementation-friendly)

- MUST use a restrained, gift-focused UI: light surfaces, high-contrast text, large tappable controls.
- SHOULD use celebratory accents (confetti micro-illustration) only on success states (e.g., “Reserved”, “Marked purchased”).
- MUST avoid heavy gradients/animations; keep motion subtle and functional.

### Layout grid & spacing

- DESKTOP_MAX_CONTENT_WIDTH: 1120px
- STANDARD_GUTTERS:
  - MOBILE: 16px
  - TABLET: 24px
  - DESKTOP: 32px
- CARD_RADIUS: 14px (default), 18px (hero/cover)
- TAP_TARGET_MIN: 44px
- LIST_ITEM_ROW_HEIGHT_TARGET: 64–76px (depending on metadata density)

### Core interaction patterns

- MUST use skeleton loaders for list + item feeds.
- MUST use toasts for “Copied link”, “Reserved”, “Released”, “Saved”.
- SHOULD use bottom sheets on mobile; side drawers on desktop for secondary actions.

---

## NAVIGATION

### App mode segmentation

- MODE_APP (authenticated owner/gifter):
  - Includes persistent navigation.
- MODE_PUBLIC (shared link view):
  - Minimal chrome; no persistent nav required.
  - CTA to sign in/up when needed (claiming, commenting, etc.).

### Desktop navigation (MODE_APP)

- Layout: top header (sticky) + content container.
- Header left: brand mark (text until logo asset) -> route `/app`.
- Header center: global search (optional, collapsible).
- Header right: primary actions:
  - “Create list” button
  - Notifications icon
  - Avatar menu (Profile, Settings, Sign out)

### Mobile navigation (MODE_APP)

- Layout: bottom tab bar (sticky).
- Tabs (MUST):
  - Home
  - Lists
  - Claims
  - Profile
- Central floating action (SHOULD): “Add” (creates new list or new item via chooser sheet).

### Public view navigation (MODE_PUBLIC)

- Top bar:
  - Left: back (if navigated within app), else none
  - Center: list name (truncate)
  - Right: Share icon (copies link) OR “Sign in” (if claim requires auth)
- No bottom navigation.

---

## DATA OBJECTS (UI-FACING)

### Object: LIST

- Fields used in UI:
  - list_id
  - title
  - occasion_type (Birthday, New Year, Wedding, Baby, Other)
  - occasion_date (optional)
  - visibility: [private, shared, public]
  - owner_display_name
  - cover_image (optional)
  - description (optional)
  - surprise_mode: [STRICT, SOFT, OFF]
  - allow_guest_claims: boolean
  - allow_suggestions: boolean (OPTIONAL)
  - created_at, updated_at

### Object: ITEM

- Fields used in UI:
  - item_id
  - list_id
  - title
  - image_url (optional)
  - price (optional) + currency (optional)
  - source_url (optional) + merchant_domain (derived)
  - quantity_requested (default 1)
  - quantity_claimed_reserved
  - quantity_claimed_purchased
  - priority: [low, medium, high] (optional)
  - category (optional)
  - notes (size/color/etc.)
  - is_hidden (owner-only)
  - created_at, updated_at

### Object: CLAIM (gifter-side only)

- Fields used in UI:
  - claim_id
  - item_id
  - claimer_user_id (nullable if guest claim)
  - status: [RESERVED, PURCHASED, RELEASED, EXPIRED]
  - quantity
  - reserved_until (optional)
  - created_at, updated_at
  - private_note_to_self (gifter-only)

---

## SURPRISE + PRIVACY MODEL (UI)

### Surprise modes (list setting)

- STRICT:
  - Owner view MUST NOT show per-item claim status.
  - Owner may see only aggregate counters at list-level (e.g., “3 gifts claimed”) (optional).
- SOFT (recommended default):
  - Owner view MAY show per-item “Claimed” badge (no buyer identity, no status split).
  - Owner MUST NOT see buyer identity.
- OFF:
  - Owner view MAY show “Reserved/Purchased” per item (still MUST NOT show buyer identity unless buyer opts-in explicitly; default is hidden).

### Buyer identity

- MUST be hidden from owner by default.
- MAY expose buyer identity ONLY if buyer explicitly attaches a public “from” note to the gift (OPTIONAL feature; default off).

### Address handling

- Owner delivery preferences MUST be stored in Settings, but public viewers MUST NOT see full address.
- Public viewer MAY see city/region only (optional) if needed for local pickup logic.

---

## PATTERNS LIBRARY (derived from popular wish list + registry products)

> Each pattern defines a reusable layout/interaction blueprint. Screens MUST reference patterns to stay consistent.

### PATTERN: SHAREABLE_PUBLIC_LIST_LINK

- Intent: one URL that anyone can open to shop the list.
- Layout:
  - HERO header (cover image optional) + list title + owner name + occasion chip
  - Primary CTA row: “Reserve” / “Mark purchased” lives on each item, not on header
  - Secondary CTA: “Copy link” (icon) and “Open in app” (if applicable)
- Key behaviors:
  - Fast load; minimal auth friction until a claim action is attempted.

### PATTERN: UNIVERSAL_ITEM_ADD (URL -> preview)

- Intent: paste a URL, auto-fill details, then edit.
- Layout:
  - Step 1: URL input + “Fetch details” button
  - Step 2: Preview card (image/title/merchant/price) + editable fields (title, price, notes)
  - Step 3: Save + Add another
- MUST support manual add (no URL) in same flow.

### PATTERN: ITEM_CARD_DUAL_MODES (owner vs gifter)

- Owner mode:
  - Primary action: Edit
  - Secondary: Hide / Archive
  - Claim status display depends on surprise_mode
- Gifter mode:
  - Primary actions: Reserve, Mark purchased, Release (if reserved by self)
  - Secondary: Private note to self, Copy item link, Open merchant link

### PATTERN: RESERVE_THEN_PURCHASE

- Two-phase claiming:
  - Reserve = intent to buy; blocks duplicates
  - Purchased = confirmed; remains blocked
- MUST support undo/release.
- MUST support quantity > 1 (partial reserves/purchases).

### PATTERN: GIFTER_SHOPPING_LIST (claims dashboard)

- Intent: aggregated view of all items the gifter has reserved/purchased across multiple lists.
- Layout:
  - Filter chips: [All, Reserved, Purchased] + date range (optional)
  - Sort: by merchant, by list, by soonest reserved_until
  - Each row: item thumbnail + title + list owner + status pill + “Open list” link
- MUST support quick “Mark purchased” from this dashboard.

### PATTERN: VISIBILITY + INVITES

- List privacy controls:
  - PRIVATE: only owner
  - SHARED: invite-only (email invites)
  - PUBLIC: anyone with link; optionally indexable (default: not indexed)
- Invites UI:
  - Invite drawer: email entry + role selection:
    - ROLE_VIEWER: can view list
    - ROLE_EDITOR (optional): can add/edit items but cannot change list ownership/settings

### PATTERN: BOARD_VIEW (optional alternative to list view)

- Inspired by “board/collection” products:
  - Masonry grid of cards
  - Category tabs or sections
  - Best for image-heavy lists; less optimal for dense metadata
- MUST be user-selectable layout: [LIST_VIEW, GRID_VIEW]

---

## SCREENS (canonical)

### SCREEN: AUTH_ENTRY
- ROUTE: `/auth`
- MODE: MODE_APP
- PURPOSE: entry to login/signup/magic link
- LAYOUT:
  - Centered auth card (max width 420px)
  - Tabs: [Email magic link, Password] (password optional)
- COMPONENTS:
  - AuthCard
  - InlineLegalLinks
- STATES:
  - success: “Check your email” confirmation
  - error: inline message under field

### SCREEN: HOME (authenticated)
- ROUTE: `/app`
- MODE: MODE_APP
- PURPOSE: quick access to personal lists + recent claims
- LAYOUT:
  - Section 1: “Your lists” horizontal carousel (mobile) / grid (desktop)
  - Section 2: “Recently claimed on your lists” (owner-facing; respects surprise_mode)
  - Section 3: “Your claims” mini list (gifter)
- COMPONENTS:
  - ListCard
  - ItemRowCompact
  - EmptyStateCard

### SCREEN: LISTS_INDEX (owner)
- ROUTE: `/app/lists`
- MODE: MODE_APP
- LAYOUT:
  - Header row: title + Create button + search
  - Filters: chips for occasion_type + visibility
  - Content: ListCard grid (2–3 columns desktop, 1 column mobile)
- EMPTY:
  - Illustration + “Create your first wishlist” CTA

### SCREEN: LIST_CREATE_EDIT
- ROUTE: `/app/lists/new` and `/app/lists/[list_id]/edit`
- MODE: MODE_APP
- LAYOUT (form):
  - Cover image uploader (optional) at top
  - Fields: title, occasion_type, occasion_date, description
  - Privacy block: visibility + invite management
  - Surprise block: surprise_mode selector + explanation text
  - Advanced: allow_guest_claims, allow_suggestions (optional)
  - Sticky bottom action bar: Save / Cancel
- VALIDATION:
  - title required; occasion_date optional
  - visibility change warns about share link behavior

### SCREEN: LIST_DETAIL_OWNER
- ROUTE: `/app/lists/[list_id]`
- MODE: MODE_APP
- PATTERNS: [ITEM_CARD_DUAL_MODES, UNIVERSAL_ITEM_ADD]
- LAYOUT:
  - HERO header:
    - cover image (optional) + title + occasion chip + date + visibility badge
    - actions: Share, Edit list, Settings (kebab)
  - Subheader stats row (optional):
    - item count, “claimed” count (surprise_mode dependent)
  - Category tabs (optional) + search within list
  - Item feed:
    - default LIST_VIEW rows with thumbnails
    - optional GRID_VIEW toggle
  - Sticky footer (mobile): “Add item” CTA
- ITEM ACTIONS (owner):
  - Edit item (opens drawer)
  - Hide item (owner-only)
  - Reorder items (drag/drop desktop; long-press mobile) (optional)

### SCREEN: LIST_DETAIL_PUBLIC (gifter/guest)
- ROUTE: `/l/[public_slug]` (or `/share/[token]`)
- MODE: MODE_PUBLIC
- PATTERNS: [SHAREABLE_PUBLIC_LIST_LINK, ITEM_CARD_DUAL_MODES, RESERVE_THEN_PURCHASE]
- LAYOUT:
  - HERO:
    - owner name + title + occasion/date + short description
    - optional “Message from owner” card
  - Info strip:
    - “How claiming works” collapsible (1–2 sentences + learn more)
  - Item feed (LIST_VIEW default):
    - Each item shows:
      - image, title, merchant domain, price (if known), notes indicator, quantity remaining indicator
      - availability state: Available / Reserved / Purchased / Partially available
      - actions: Reserve / Mark purchased (or disabled if unavailable)
  - Footer:
    - “View your reserved gifts” link (if authenticated) OR “Sign in to track” prompt

### SCREEN: ITEM_CREATE_EDIT (owner)
- ROUTE: drawer/modal from LIST_DETAIL_OWNER
- MODE: MODE_APP
- PATTERNS: [UNIVERSAL_ITEM_ADD]
- LAYOUT:
  - Drawer (desktop right) / bottom sheet (mobile)
  - Stepper (optional):
    - URL -> Preview -> Details
  - Fields:
    - title (required)
    - image (upload or fetched)
    - source_url
    - price + currency
    - quantity_requested
    - priority
    - category
    - notes (size/color/etc.)
  - Actions:
    - Save
    - Save + add another
    - Cancel
- OWNER VISIBILITY:
  - Toggle “Hide from viewers” (owner-only)

### SCREEN: ITEM_DETAIL_PUBLIC (gifter)
- ROUTE: modal/drawer from LIST_DETAIL_PUBLIC
- MODE: MODE_PUBLIC
- LAYOUT:
  - Large image (if available)
  - Title + merchant + price + notes block
  - Quantity selector (if >1 remaining)
  - Primary CTA: Reserve (or Purchased)
  - Secondary: Open merchant link (external), Copy item link, Add private note
  - Status explanation: “Owner won’t see who reserved/purchased” (based on settings)
- POST_ACTION:
  - Success toast + update item card state in list
  - Offer: “Go to your claims”

### SCREEN: CLAIMS_INDEX (gifter)
- ROUTE: `/app/claims`
- MODE: MODE_APP
- PATTERNS: [GIFTER_SHOPPING_LIST]
- LAYOUT:
  - Tabs: Reserved / Purchased / All
  - Sort: merchant, list, reserved_until
  - Each claim row:
    - item thumbnail + title
    - list owner + list title (subtext)
    - status pill
    - actions: Mark purchased, Release, Open list
- EMPTY:
  - “You haven’t reserved anything yet” + CTA “Shop a list link”

### SCREEN: PROFILE
- ROUTE: `/app/profile`
- MODE: MODE_APP
- LAYOUT:
  - Profile header: avatar + display name + share profile link (optional)
  - Section: default privacy settings
  - Section: notification preferences
  - Section: connected emails/devices
  - Danger zone: delete account

### SCREEN: SETTINGS (app-level)
- ROUTE: `/app/settings`
- MODE: MODE_APP
- LAYOUT:
  - Two-pane settings on desktop (left nav + right content)
  - Single-pane stacked on mobile
- SECTIONS:
  - Account
  - Privacy
  - Notifications
  - Appearance (light/dark)
  - Security

---

## COMPONENTS (canonical)

### COMPONENT: ListCard
- Used in: LISTS_INDEX, HOME
- Layout:
  - Cover thumbnail (optional) or gradient placeholder
  - Title (2 lines max)
  - Occasion chip + date
  - Visibility badge
  - Progress mini-meter (optional): “X items • Y claimed”
- Actions:
  - Click -> LIST_DETAIL_OWNER
  - Kebab -> Edit/Share/Delete

### COMPONENT: ListHeroHeader
- Used in: LIST_DETAIL_OWNER, LIST_DETAIL_PUBLIC
- Layout:
  - Cover image (optional) with overlay
  - Title + owner name + occasion/date chips
  - Action cluster (Share, Edit, Settings) (owner)
- Responsive:
  - Desktop: actions inline right
  - Mobile: actions in icon row under title

### COMPONENT: ItemRow
- Used in: LIST_DETAIL_OWNER, LIST_DETAIL_PUBLIC
- Layout (default LIST_VIEW):
  - Left: thumbnail (56–64px square)
  - Middle: title + merchant domain + price line (optional)
  - Right: status pill + actions
- Notes:
  - Show a small “note” icon if notes present; expand in item detail.

### COMPONENT: ItemActionsOwner
- Buttons:
  - Edit (primary)
  - Hide/Unhide (secondary)
  - Duplicate item (optional)

### COMPONENT: ItemActionsGifter
- Buttons:
  - Reserve (primary when available)
  - Purchased (primary alternative)
  - Release (visible only if reserved_by_self)
- Quantity:
  - If quantity_remaining > 1, show quantity stepper (1..remaining)
- State:
  - Unavailable -> disabled buttons + “Taken” label

### COMPONENT: ShareSheet
- Used in: LIST_DETAIL_OWNER, LIST_DETAIL_PUBLIC
- Layout:
  - Share link input (read-only) + Copy button
  - QR code (optional)
  - Invite block (shared lists): email input + role dropdown + send
  - Permission hint text
- Feedback:
  - Copy -> toast
  - Invite -> inline success per email

### COMPONENT: SurpriseModeSelector
- Layout:
  - 3-option segmented control (STRICT / SOFT / OFF)
  - Each option has 1-line description
- MUST include preview snippet:
  - “Owner will see: …”
  - “Gifters will see: …”

### COMPONENT: EmptyStateCard
- Layout:
  - Small illustration icon
  - 1-line title + 1-line guidance
  - CTA button

### COMPONENT: Toast
- Variants:
  - success, error, neutral
- Duration:
  - 3s default; errors sticky until dismissed (optional)

### COMPONENT: SkeletonFeed
- Used for: list grids, item rows, claims feed
- MUST mimic final layout to reduce CLS.

---

## STATES (standardized)

### Loading

- MUST show skeletons for:
  - List grids
  - Item feed
  - Claims feed
- MUST keep header visible while loading body.

### Empty

- LISTS_INDEX empty:
  - CTA: Create list
- LIST_DETAIL empty:
  - CTA: Add first item
- CLAIMS empty:
  - CTA: Open a shared link / browse

### Error

- MUST show inline error card with:
  - “Retry” action
  - “Contact support” link (optional)
- MUST preserve already-loaded content when incremental fetch fails.

### Offline / poor network (optional)

- Show “Trying to reconnect…” banner at top.
- Queue “reserve” actions only if safe; otherwise require confirmation.

---

## RESPONSIVE RULES

- Breakpoints:
  - MOBILE: < 640px
  - TABLET: 640–1024px
  - DESKTOP: > 1024px
- On mobile:
  - Prefer bottom sheets and sticky bottom CTA bars.
  - Item actions MUST be thumb-reachable; avoid tiny icon-only controls for primary actions.
- On desktop:
  - Prefer right-side drawers for item edit/detail.
  - Enable keyboard shortcuts (optional):
    - `/` focuses search
    - `n` new item
    - `c` copy share link

---

## ACCESSIBILITY

- MUST meet WCAG AA contrast for text + interactive elements.
- MUST provide:
  - Focus rings for keyboard nav
  - ARIA labels for icon buttons
  - Proper heading hierarchy (H1 list title, H2 sections)
- MUST support reduced motion:
  - Disable celebratory motion; keep state changes instantaneous or fade-only.

---

## OPTIONAL MODULES (v2+; do not implement unless requested)

### OPTIONAL: Gift suggestions (buyer-only)

- Buyers can suggest ideas visible only to other buyers (not list owner).
- Layout:
  - “Suggestions” tab in public view, gated behind sign-in.

### OPTIONAL: Thank-you tracking

- Owner sees “Thank you” checklist after event date:
  - Items received + note composer

### OPTIONAL: Group events / Secret Santa

- Group page with participants and shared lists
- Not required for MVP

---

## IMPLEMENTATION NOTES (non-visual, for planning)

- Next.js:
  - MODE_PUBLIC routes MUST be cache-friendly and fast (SSR/ISR acceptable).
- Supabase:
  - RLS MUST enforce:
    - owner-only for list/item management
    - viewers can read public/shared lists
    - claims readable only by claimer; owner sees only aggregated/filtered fields per surprise_mode
- Storage:
  - item images and list covers stored in Supabase Storage; use signed URLs for private assets.

