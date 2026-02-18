<!-- technical.md -->

The app is a consumer Wish List web app for gift-giving occasions (birthdays, New Year, holidays) built on Next.js (Vercel) and Supabase.

NOTE:
- Spec is feature-first and intentionally comprehensive; implement iteratively (v1 → vNext).
- Default “Surprise Mode”: wishlist owners do not see which items are reserved/purchased or by whom.
- The app is “universal”: it does not sell products; item purchase happens on external retailer sites.

## Platform and architecture

- Frontend: Next.js (App Router), TypeScript, Tailwind CSS.
- Hosting: Vercel (serverless + edge where useful).
- Backend: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions/cron).
- Realtime: reservation/contribution state updates and notifications.
- Background jobs: reservation expiry, reminder emails, optional price checks.
- Limits (suggested defaults):
  - 10 MB max per uploaded image (avatar, list cover, item image, receipt).
  - URL metadata fetch timeout 3–5 seconds with strict SSRF protections.
- Auth:
  - Supabase Auth email/password + magic link.
  - Optional social providers (Google, Apple).
  - “Guest mode” supported for viewing and (optionally) reserving items via share links.

## Core concepts and entities

- user: authenticated Supabase Auth identity.
- profile: public-facing identity (name, username, avatar) + preferences.
- recipient_profile: optional “sub-profile” (kids/partner) managed by a parent account.
- event: occasion metadata (type + date + timezone) used for reminders and grouping lists.
- wishlist: container of items with privacy and sharing configuration.
- wishlist_member: invited user with a role (viewer, gifter, collaborator).
- share_link: revocable tokenized link providing scoped access without requiring account creation.
- item: wish entry (product URL or custom/offline item); quantity, priority, notes, images.
- item_state: derived availability state for shoppers (reserved/purchased counts) and per-viewer visibility rules.
- claim: reservation/purchase record created by a gifter (user or guest).
- contribution: group-gift contribution records tied to an item.
- suggestion: “secret suggestion” visible to gifters (optionally) but hidden from wishlist owner.
- comment: threaded discussion on a list or item (supports Q&A).
- notification: in-app + email/push message generated from events/actions.
- audit_log: immutable record of sensitive operations (share link rotation, role changes, claim overrides).

## Access control model

- Primary security boundary is per-wishlist.
- Roles:
  - owner: creator/manager of a wishlist.
  - collaborator: can edit wishlist and items; can manage members and settings (scoped).
  - gifter: can reserve/purchase items; may comment/ask questions; may see reservation state.
  - viewer: can view items; may comment (optional).
  - guest: unauthenticated visitor via share_link; capabilities configurable per wishlist.
  - admin: platform operator role for moderation and abuse handling.

- Surprise Mode rules (default):
  - owner cannot see claimers or reservation/purchase state.
  - other gifters can see “reserved/purchased” state to prevent duplicates.
  - identity visibility is configurable:
    - default: show status only (not reserver identity) to other gifters.
    - optional: show reserver display name to other gifters.

- Spoiler Mode (optional, per wishlist):
  - owner can see reservation/purchase state (still may hide gifter identity unless explicitly enabled).

## Feature catalog (machine-readable)

```yaml
catalog:
  product: "Wish List Web App"
  stack: ["Next.js", "Vercel", "Supabase(Postgres/Auth/Storage/Realtime)"]
  defaults:
    privacy_mode: "surprise"   # owner does not see reservation/purchase status
    universal_links: true      # no native checkout; redirects to retailers
  modules:

    - key: identity
      name: "Identity, Accounts, Profiles"
      features:
        - id: WL-AUTH-001
          title: "Email/password sign up"
          desc: "Create an account using email and password; store minimal profile on first login."
          actors: ["guest"]
          scope: "v1"
        - id: WL-AUTH-002
          title: "Email/password sign in"
          desc: "Authenticate returning users with email and password; persist session across refresh."
          actors: ["guest"]
          scope: "v1"
        - id: WL-AUTH-003
          title: "Magic link sign in"
          desc: "Offer passwordless login via emailed one-time link."
          actors: ["guest"]
          scope: "v1"
        - id: WL-AUTH-004
          title: "Email verification enforcement"
          desc: "Block key write actions until email is verified (configurable for guest-only flows)."
          actors: ["user"]
          scope: "v1"
        - id: WL-AUTH-005
          title: "Password reset"
          desc: "Allow account recovery via email-based password reset."
          actors: ["user"]
          scope: "v1"
        - id: WL-AUTH-006
          title: "Optional social login"
          desc: "Enable OAuth providers (Google/Apple) via Supabase Auth."
          actors: ["guest"]
          scope: "vNext"
        - id: WL-ACC-001
          title: "Account settings"
          desc: "Manage email, password, connected providers, and active sessions."
          actors: ["user"]
          scope: "v1"
        - id: WL-ACC-002
          title: "Sign out everywhere"
          desc: "Invalidate all sessions/devices for the account."
          actors: ["user"]
          scope: "v1"
        - id: WL-ACC-003
          title: "Account deletion"
          desc: "Self-serve delete/anonymize account with cascade rules for owned lists."
          actors: ["user"]
          scope: "v1"
        - id: WL-ACC-004
          title: "Data export"
          desc: "Export owned wishlists/items/history as JSON/CSV."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-001
          title: "Profile identity"
          desc: "Edit display name, username/slug, bio, and optional pronouns."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-002
          title: "Avatar upload"
          desc: "Upload and crop a profile avatar; store in Supabase Storage."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-003
          title: "Public profile page"
          desc: "Expose a shareable profile URL listing selected public/link-shared wishlists."
          actors: ["user", "guest"]
          scope: "v1"
        - id: WL-PROF-004
          title: "Profile discovery controls"
          desc: "Toggle whether profile is searchable/listed or only accessible via direct link."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-005
          title: "Locale + currency preferences"
          desc: "Store preferred language/locale and default currency for display and new items."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-006
          title: "Notification preferences"
          desc: "Per-channel preferences (email/in-app/push) and per-event notification types."
          actors: ["user"]
          scope: "v1"
        - id: WL-PROF-007
          title: "Shipping address vault"
          desc: "Store one or more shipping addresses with visibility rules per wishlist."
          actors: ["user"]
          scope: "v1"
        - id: WL-RECIP-001
          title: "Recipient sub-profiles"
          desc: "Create managed recipient profiles (kids/partner) that can own wishlists under a parent account."
          actors: ["user"]
          scope: "vNext"
        - id: WL-RECIP-002
          title: "Recipient privacy rules"
          desc: "Optional rule: parent can see reservation status for child-managed lists while child cannot."
          actors: ["user"]
          scope: "vNext"

    - key: events
      name: "Events and Occasions"
      features:
        - id: WL-EVT-001
          title: "Create event"
          desc: "Create an occasion with type, title, date, timezone, and optional location."
          actors: ["user"]
          scope: "v1"
        - id: WL-EVT-002
          title: "Recurring annual event"
          desc: "Support repeating events (e.g., birthdays) by storing month/day and computing next occurrence."
          actors: ["user"]
          scope: "v1"
        - id: WL-EVT-003
          title: "Event landing page"
          desc: "Optional public page that shows event details + linked wishlists + message."
          actors: ["user", "guest"]
          scope: "vNext"
        - id: WL-EVT-004
          title: "Event guest list"
          desc: "Attach invited participants to an event (used for reminders and access shortcuts)."
          actors: ["user"]
          scope: "vNext"
        - id: WL-EVT-005
          title: "Event reminders"
          desc: "Schedule reminders before the event date for owner and invited gifters."
          actors: ["system"]
          scope: "v1"

    - key: wishlists
      name: "Wishlists"
      features:
        - id: WL-LIST-001
          title: "Create wishlist"
          desc: "Create a wishlist with title, description, cover image, and optional linked event."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-002
          title: "Multiple wishlists per account"
          desc: "Allow unlimited wishlists per user; each list has independent settings and audience."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-003
          title: "Wishlist templates"
          desc: "Start from a template that pre-fills categories and common starter items."
          actors: ["user"]
          scope: "vNext"
        - id: WL-LIST-004
          title: "Clone wishlist"
          desc: "Duplicate an existing wishlist (metadata + items) into a new list."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-005
          title: "Archive/close wishlist"
          desc: "Mark a wishlist as archived to freeze claims and move it to history."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-006
          title: "Wishlist privacy modes"
          desc: "Set visibility: private, invite-only, link-only, or public."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-007
          title: "Password-protected wishlist"
          desc: "Optional password on share link (stored hashed) for additional access control."
          actors: ["user", "guest"]
          scope: "vNext"
        - id: WL-LIST-008
          title: "Enable/disable reservation system"
          desc: "Toggle whether shoppers can reserve/mark purchased on a per-list basis."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-009
          title: "Enable/disable guest actions"
          desc: "Toggle whether guests (no account) can reserve/mark purchased."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-010
          title: "Surprise vs spoiler mode"
          desc: "Per-list toggle: hide reservation/purchase state from owner (surprise) or show it (spoiler)."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-011
          title: "Welcome message"
          desc: "Owner-defined message shown at top of shared list to instruct gifters (e.g., shipping, store policies)."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-012
          title: "Manual item ordering"
          desc: "Drag-and-drop ordering per list, stored as stable sort_index."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-LIST-013
          title: "List theming"
          desc: "Set cover image, accent theme, and layout options for a shareable ‘nice looking’ list."
          actors: ["user"]
          scope: "v1"
        - id: WL-LIST-014
          title: "List analytics summary"
          desc: "Owner can see aggregate counts (views, item clicks) without exposing gift claim details."
          actors: ["user"]
          scope: "vNext"

    - key: items
      name: "Items and Content"
      features:
        - id: WL-ITEM-001
          title: "Manual item creation"
          desc: "Create an item with title, description, price, currency, quantity, and optional link."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-002
          title: "Add item from URL"
          desc: "Paste a product URL from any store to create an item."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-003
          title: "URL metadata fetch"
          desc: "Auto-fill item name/image/price by fetching OpenGraph/structured data from the URL."
          actors: ["system"]
          scope: "v1"
        - id: WL-ITEM-004
          title: "Multiple retailer links"
          desc: "Attach multiple purchase links (preferred + alternatives) for the same item."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-005
          title: "Item notes (size/color/etc.)"
          desc: "Free-form notes field for preferences like size, color, model, or personalization."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-006
          title: "Priority levels"
          desc: "Mark item priority (e.g., must-have / nice-to-have) to guide gifters."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-007
          title: "Quantity requested"
          desc: "Support quantities >1 and partial fulfillment tracking for reservations/purchases."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-008
          title: "Item categories + tags"
          desc: "Categorize items (e.g., clothing, books) and add tags for filtering."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-009
          title: "Item images upload"
          desc: "Upload one or more images per item to Supabase Storage."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-010
          title: "Offline item support"
          desc: "Create an item without a URL using store name, notes, and photos."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-011
          title: "Barcode scan add (optional)"
          desc: "Use device camera to scan barcode and prefill item details via external product DB."
          actors: ["user"]
          scope: "vNext"
        - id: WL-ITEM-012
          title: "Location-tag offline items (optional)"
          desc: "Attach a store location (city/coords) to offline items to help local shoppers."
          actors: ["user"]
          scope: "vNext"
        - id: WL-ITEM-013
          title: "Cash fund item"
          desc: "Create a cash-fund style item with goal and external payment links (Venmo/PayPal/etc.)."
          actors: ["user"]
          scope: "v1"
        - id: WL-ITEM-014
          title: "Group gift item"
          desc: "Enable multi-person contributions toward an item with tracked funded amount and goal."
          actors: ["user"]
          scope: "v1"
        - id: WL-ITEM-015
          title: "Experience/service item type"
          desc: "Support non-product items (tickets, lessons) with custom fulfillment instructions."
          actors: ["user"]
          scope: "v1"
        - id: WL-ITEM-016
          title: "Gift card item type"
          desc: "Support gift-card style items with preferred brand and amount."
          actors: ["user"]
          scope: "v1"
        - id: WL-ITEM-017
          title: "Item reservability toggle"
          desc: "Mark an item as unreservable (view-only) to prevent claims."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-018
          title: "Draft/hidden items"
          desc: "Keep items in draft so only owner/collaborators can see until published."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-019
          title: "Copy/move items between lists"
          desc: "Copy an item to another wishlist; optionally delete from source to emulate ‘move’."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-ITEM-020
          title: "Bulk add/edit items"
          desc: "Bulk operations: add multiple items, edit category/priority, archive, delete."
          actors: ["user", "collaborator"]
          scope: "vNext"
        - id: WL-ITEM-021
          title: "Price snapshots"
          desc: "Store last_seen_price and timestamp for URL-based items; update on metadata refresh."
          actors: ["system"]
          scope: "v1"
        - id: WL-ITEM-022
          title: "Price history"
          desc: "Maintain price history time series for items (optional, capped retention)."
          actors: ["system"]
          scope: "vNext"
        - id: WL-ITEM-023
          title: "Price drop alerts"
          desc: "Notify interested users when price falls below threshold or drops by %."
          actors: ["system"]
          scope: "vNext"
        - id: WL-ITEM-024
          title: "Outbound click tracking"
          desc: "Track clicks on retailer links (aggregate only) for analytics without exposing claim data."
          actors: ["system"]
          scope: "vNext"
        - id: WL-ITEM-025
          title: "Duplicate detection (URL)"
          desc: "Warn when adding an item with a URL already present in the same wishlist."
          actors: ["system"]
          scope: "v1"
        - id: WL-ITEM-026
          title: "Item share deep link"
          desc: "Direct link to an individual item within a wishlist (for messaging)."
          actors: ["user", "guest"]
          scope: "v1"

    - key: sharing
      name: "Sharing and Access"
      features:
        - id: WL-SHARE-001
          title: "Share link generation"
          desc: "Generate a shareable link for a wishlist with a scoped token and default permissions."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-002
          title: "Share permissions presets"
          desc: "Choose preset modes: view-only, shop/reserve, or collaborate/edit."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-003
          title: "Revocable share links"
          desc: "Rotate/revoke share tokens without changing the wishlist itself."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-004
          title: "Invite by email"
          desc: "Send email invitations that map to wishlist_member roles when accepted."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-005
          title: "Role management"
          desc: "Change roles (viewer/gifter/collaborator) and remove members with audit logs."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-006
          title: "Private groups/circles"
          desc: "Create reusable groups (family, friends) to quickly share lists to the same audience."
          actors: ["user"]
          scope: "vNext"
        - id: WL-SHARE-007
          title: "Public directory (optional)"
          desc: "Allow users to opt-in to being searchable by username for public lists."
          actors: ["user", "guest"]
          scope: "vNext"
        - id: WL-SHARE-008
          title: "QR code for share"
          desc: "Generate QR code for the wishlist share link for printed invites/party posters."
          actors: ["user"]
          scope: "v1"
        - id: WL-SHARE-009
          title: "Social share metadata"
          desc: "Set OpenGraph/Twitter meta for nice preview cards when sharing the link."
          actors: ["system"]
          scope: "v1"
        - id: WL-SHARE-010
          title: "Access audit (privacy-safe)"
          desc: "Store aggregate view counts and last_viewed_at without exposing viewer identity by default."
          actors: ["system"]
          scope: "vNext"
        - id: WL-SHARE-011
          title: "Per-list capability toggles"
          desc: "Toggle guest viewing, guest reserving, comments, and suggestions per wishlist."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SHARE-012
          title: "Profile multi-list share"
          desc: "Share a single profile URL aggregating multiple wishlists (e.g., birthday + holiday)."
          actors: ["user", "guest"]
          scope: "v1"

    - key: claiming
      name: "Reservations, Purchases, and Availability"
      features:
        - id: WL-CLAIM-001
          title: "Reserve item"
          desc: "Gifter reserves an item (or quantity) to prevent duplicate purchases."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-CLAIM-002
          title: "Unreserve item"
          desc: "Gifter can release a reservation so others can claim it."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-CLAIM-003
          title: "Mark purchased"
          desc: "Gifter marks reserved quantity as purchased after buying externally."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-CLAIM-004
          title: "Mark given"
          desc: "Optional post-event state: gifter marks an item as given (for history tracking)."
          actors: ["gifter", "guest"]
          scope: "vNext"
        - id: WL-CLAIM-005
          title: "Partial reservation for quantity"
          desc: "Support reserving subset quantities and show remaining available quantity."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-CLAIM-006
          title: "Surprise mode visibility rules"
          desc: "Owner view hides reservation/purchase state; gifter view shows it to prevent duplicates."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-007
          title: "Spoiler mode visibility rules"
          desc: "If spoiler mode enabled, owner view also shows reservation/purchase state."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-008
          title: "Reserver identity privacy"
          desc: "Configurable: show only status or also show reserver name to other gifters."
          actors: ["user"]
          scope: "v1"
        - id: WL-CLAIM-009
          title: "Guest reservations"
          desc: "Allow reserving without account by capturing name and optional email."
          actors: ["guest"]
          scope: "v1"
        - id: WL-CLAIM-010
          title: "Guest claim management links"
          desc: "If email provided, send a one-time link to view/update/cancel guest reservations."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-011
          title: "Reservation expiry"
          desc: "Auto-expire reservations after configurable duration unless marked purchased."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-012
          title: "Expiry warning notifications"
          desc: "Notify claimers before expiry to confirm purchase or release reservation."
          actors: ["system"]
          scope: "vNext"
        - id: WL-CLAIM-013
          title: "Atomic claim enforcement"
          desc: "Use DB transaction/RPC to prevent race conditions when multiple gifters reserve simultaneously."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-014
          title: "Item-level claim disable enforcement"
          desc: "Enforce unreservable items at API/DB level (not just UI)."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-015
          title: "Claim notes (private)"
          desc: "Allow claimers to store a private note (e.g., order number) visible only to them."
          actors: ["gifter"]
          scope: "vNext"
        - id: WL-CLAIM-016
          title: "Receipt attachment (optional)"
          desc: "Allow claimers to upload a receipt image/PDF for their own record (private)."
          actors: ["gifter"]
          scope: "vNext"
        - id: WL-CLAIM-017
          title: "Owner override for stuck claims"
          desc: "Collaborator/owner can clear stale reservations (with audit log), even in surprise mode."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-CLAIM-018
          title: "Claim history log"
          desc: "Maintain append-only claim_events for reservations/purchases for audit/debug."
          actors: ["system"]
          scope: "vNext"
        - id: WL-CLAIM-019
          title: "Prevent self-claim"
          desc: "Owner cannot reserve/purchase items on their own list (unless explicitly enabled)."
          actors: ["system"]
          scope: "v1"
        - id: WL-CLAIM-020
          title: "Gifter shopping dashboard"
          desc: "Gifter can view all their reserved/purchased items across recipients/lists."
          actors: ["gifter"]
          scope: "v1"
        - id: WL-CLAIM-021
          title: "Shopping dashboard filters"
          desc: "Filter reserved/purchased by store, date range, recipient, and event."
          actors: ["gifter"]
          scope: "v1"
        - id: WL-CLAIM-022
          title: "Shopping dashboard export"
          desc: "Export shopping dashboard as CSV/printable checklist."
          actors: ["gifter"]
          scope: "vNext"

    - key: contributions
      name: "Contributions and Group Gifting"
      features:
        - id: WL-FUND-001
          title: "Enable contributions on item"
          desc: "Toggle contributions for an item and set a target amount (goal)."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-FUND-002
          title: "Contribution pledges/entries"
          desc: "Allow contributors to record an amount contributed toward an item."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-FUND-003
          title: "External payments (v1)"
          desc: "Support external payment links (Venmo/PayPal/etc.) while tracking pledged amounts in-app."
          actors: ["user", "gifter", "guest"]
          scope: "v1"
        - id: WL-FUND-004
          title: "Stripe payments (vNext)"
          desc: "Optional built-in payments via Stripe Checkout with webhook reconciliation."
          actors: ["system"]
          scope: "vNext"
        - id: WL-FUND-005
          title: "Contributor anonymity"
          desc: "Configurable: show contributor names to owner, to other contributors, or hide."
          actors: ["user"]
          scope: "v1"
        - id: WL-FUND-006
          title: "Contribution caps"
          desc: "Prevent overfunding by enforcing max remaining amount; close contributions at goal."
          actors: ["system"]
          scope: "v1"
        - id: WL-FUND-007
          title: "Contribution receipts"
          desc: "Send an email receipt/confirmation for recorded contributions (even if external)."
          actors: ["system"]
          scope: "vNext"
        - id: WL-FUND-008
          title: "Contribution ledger export"
          desc: "Owner can export contribution ledger for bookkeeping."
          actors: ["user"]
          scope: "vNext"
        - id: WL-FUND-009
          title: "Contribution notes"
          desc: "Allow optional message with a contribution (e.g., ‘from all of us’)."
          actors: ["gifter", "guest"]
          scope: "v1"

    - key: social
      name: "Comments, Q&A, Suggestions, and Thanks"
      features:
        - id: WL-SOC-001
          title: "Item comments"
          desc: "Threaded comments on an item for questions/clarifications."
          actors: ["viewer", "gifter", "collaborator"]
          scope: "v1"
        - id: WL-SOC-002
          title: "List comments"
          desc: "Threaded comments at list level (optional enable per list)."
          actors: ["viewer", "gifter", "collaborator"]
          scope: "vNext"
        - id: WL-SOC-003
          title: "Anonymous Q&A (optional)"
          desc: "Gifters can ask the owner questions without revealing identity."
          actors: ["gifter", "guest"]
          scope: "vNext"
        - id: WL-SOC-004
          title: "Secret suggestions"
          desc: "Gifters can suggest additional items that the owner cannot see (surprise-safe)."
          actors: ["gifter"]
          scope: "v1"
        - id: WL-SOC-005
          title: "Suggestion visibility controls"
          desc: "Configurable: secret suggestions visible to all gifters or only to the suggester."
          actors: ["user"]
          scope: "v1"
        - id: WL-SOC-006
          title: "Mark received (owner)"
          desc: "Owner marks gifts as received after the event for history (without exposing gifter identity)."
          actors: ["user"]
          scope: "vNext"
        - id: WL-SOC-007
          title: "Gift history archive"
          desc: "Archive view per wishlist showing past items and fulfillment states."
          actors: ["user"]
          scope: "vNext"
        - id: WL-SOC-008
          title: "Thank-you notes"
          desc: "Owner drafts and tracks thank-you messages tied to gifts/contributions."
          actors: ["user"]
          scope: "vNext"

    - key: notifications
      name: "Notifications and Reminders"
      features:
        - id: WL-NOTIF-001
          title: "In-app notifications"
          desc: "Central notification inbox for invites, comments, contributions, and claim updates."
          actors: ["user", "gifter"]
          scope: "v1"
        - id: WL-NOTIF-002
          title: "Email invitations"
          desc: "Send transactional emails for wishlist invitations and share link delivery."
          actors: ["system"]
          scope: "v1"
        - id: WL-NOTIF-003
          title: "Email claim updates (gifter)"
          desc: "Notify gifters about their reservation expiry, purchases, and contribution confirmations."
          actors: ["system"]
          scope: "vNext"
        - id: WL-NOTIF-004
          title: "Email comment notifications"
          desc: "Notify subscribed participants when new comments are posted."
          actors: ["system"]
          scope: "vNext"
        - id: WL-NOTIF-005
          title: "Event reminder emails"
          desc: "Send reminders before event date to owner and optionally invited gifters."
          actors: ["system"]
          scope: "v1"
        - id: WL-NOTIF-006
          title: "Digest mode"
          desc: "Optional daily/weekly digest of wishlist activity (privacy-safe)."
          actors: ["user"]
          scope: "vNext"
        - id: WL-NOTIF-007
          title: "Push notifications (PWA)"
          desc: "Optional web push for mobile-installed PWA."
          actors: ["system"]
          scope: "vNext"
        - id: WL-NOTIF-008
          title: "Unsubscribe + preference center"
          desc: "Per-user unsubscribe handling and notification preference management."
          actors: ["system"]
          scope: "v1"

    - key: search
      name: "Search, Filtering, and Organization"
      features:
        - id: WL-SEARCH-001
          title: "Search wishlists"
          desc: "Search owned wishlists by title, event, and tags."
          actors: ["user"]
          scope: "v1"
        - id: WL-SEARCH-002
          title: "Search items"
          desc: "Search items by title, notes, tags across a wishlist (and optionally across account)."
          actors: ["user", "collaborator"]
          scope: "v1"
        - id: WL-SEARCH-003
          title: "Filter by status"
          desc: "Filter items by availability status for gifters (available/reserved/purchased)."
          actors: ["gifter", "guest"]
          scope: "v1"
        - id: WL-SEARCH-004
          title: "Filter by category/priority/price"
          desc: "Filter items by category tags, priority, and price range."
          actors: ["user", "gifter", "guest"]
          scope: "v1"
        - id: WL-SEARCH-005
          title: "Sort options"
          desc: "Sort items by manual order, priority, price, and recently added."
          actors: ["user", "gifter", "guest"]
          scope: "v1"
        - id: WL-SEARCH-006
          title: "Curated collections (optional)"
          desc: "Optional curated starter collections to inspire list creation (non-personalized)."
          actors: ["user"]
          scope: "vNext"

    - key: integrations
      name: "Import/Export and Integrations"
      features:
        - id: WL-INT-001
          title: "Browser bookmarklet/extension"
          desc: "One-click ‘Add to Wishlist’ from any product page by sending current URL to the app."
          actors: ["user"]
          scope: "vNext"
        - id: WL-INT-002
          title: "Mobile share-to app"
          desc: "Support adding items via mobile share sheet (PWA deep link) from browser."
          actors: ["user"]
          scope: "vNext"
        - id: WL-INT-003
          title: "CSV import"
          desc: "Import items from a CSV template into a wishlist."
          actors: ["user"]
          scope: "vNext"
        - id: WL-INT-004
          title: "Printable view / PDF export"
          desc: "Generate print-friendly wishlist view for offline sharing."
          actors: ["user", "guest"]
          scope: "vNext"
        - id: WL-INT-005
          title: "Affiliate tagging (optional)"
          desc: "Append affiliate parameters on outbound retailer links (configurable)."
          actors: ["system"]
          scope: "vNext"
        - id: WL-INT-006
          title: "Import from external wishlists (optional)"
          desc: "Optional import from Amazon/others where permitted; otherwise manual CSV/paste."
          actors: ["user"]
          scope: "vNext"

    - key: ux
      name: "UX, Performance, Accessibility"
      features:
        - id: WL-UX-001
          title: "Mobile-first responsive UI"
          desc: "All core flows designed for mobile use (create list, add item, reserve item)."
          actors: ["user", "guest"]
          scope: "v1"
        - id: WL-UX-002
          title: "No-login view for share links"
          desc: "Visitors can view shared wishlists without creating an account."
          actors: ["guest"]
          scope: "v1"
        - id: WL-UX-003
          title: "Fast list browsing"
          desc: "Optimize list pages with SSR/ISR, caching, and minimal client JS."
          actors: ["system"]
          scope: "v1"
        - id: WL-UX-004
          title: "Dark mode"
          desc: "Optional light/dark theme toggle (per user preference)."
          actors: ["user"]
          scope: "vNext"
        - id: WL-UX-005
          title: "Accessibility baseline"
          desc: "Keyboard navigation, focus states, semantic HTML, and screen reader labels."
          actors: ["system"]
          scope: "v1"
        - id: WL-UX-006
          title: "PWA installability"
          desc: "Installable PWA with offline caching for viewing recently opened lists."
          actors: ["system"]
          scope: "vNext"

    - key: admin
      name: "Admin, Moderation, Analytics"
      features:
        - id: WL-ADMIN-001
          title: "Basic admin dashboard"
          desc: "Admin can view user/list counts, recent activity, and reported content."
          actors: ["admin"]
          scope: "vNext"
        - id: WL-ADMIN-002
          title: "Abuse reporting"
          desc: "Allow users/visitors to report a public wishlist/item for abuse."
          actors: ["guest", "user"]
          scope: "v1"
        - id: WL-ADMIN-003
          title: "Moderation queue"
          desc: "Admin workflow for reviewing reports and taking action (hide list, ban user)."
          actors: ["admin"]
          scope: "vNext"
        - id: WL-ADMIN-004
          title: "Rate limiting"
          desc: "Protect public endpoints (share link views, metadata fetch, claims) with throttling."
          actors: ["system"]
          scope: "v1"
        - id: WL-ADMIN-005
          title: "Analytics (aggregate)"
          desc: "Track aggregate metrics: list views, item link clicks, claim counts (no personal data by default)."
          actors: ["system"]
          scope: "vNext"

    - key: security
      name: "Security, Privacy, Observability"
      features:
        - id: WL-SEC-001
          title: "RLS everywhere"
          desc: "Enable Postgres RLS on all tables; enforce access by owner/member roles."
          actors: ["system"]
          scope: "v1"
        - id: WL-SEC-002
          title: "Share token hashing"
          desc: "Store share tokens hashed; only compare hashed token server-side."
          actors: ["system"]
          scope: "v1"
        - id: WL-SEC-003
          title: "SSRF-safe metadata fetch"
          desc: "URL fetch runs in hardened server environment with allow/deny rules and timeouts."
          actors: ["system"]
          scope: "v1"
        - id: WL-SEC-004
          title: "PII encryption"
          desc: "Encrypt sensitive fields (shipping address, guest emails) at rest where feasible."
          actors: ["system"]
          scope: "vNext"
        - id: WL-SEC-005
          title: "Audit logs"
          desc: "Record membership changes, share link rotation, and claim overrides in audit_log."
          actors: ["system"]
          scope: "v1"
        - id: WL-SEC-006
          title: "Observability"
          desc: "Structured logs with redaction; track job failures and webhook/email delivery status."
          actors: ["system"]
          scope: "v1"
```

## Suggested database schema (Supabase Postgres)

- profiles
  - user_id (pk, uuid, references auth.users)
  - username (unique), display_name, bio
  - avatar_url, locale, currency
  - created_at, updated_at

- events
  - id (uuid pk)
  - owner_id (uuid)
  - type (enum), title, date_at (timestamptz), timezone
  - is_recurring_annual (bool), month_day (text)
  - created_at, updated_at

- wishlists
  - id (uuid pk)
  - owner_id (uuid)
  - recipient_profile_id (uuid, nullable)
  - event_id (uuid, nullable)
  - title, description, cover_url
  - visibility (enum: private|invite_only|link_only|public)
  - reservations_enabled (bool)
  - guest_actions_enabled (bool)
  - spoiler_mode (bool)
  - reserver_identity_mode (enum: status_only|show_name_to_gifters)
  - welcome_message
  - created_at, updated_at, archived_at

- wishlist_members
  - wishlist_id (uuid), user_id (uuid)
  - role (enum: viewer|gifter|collaborator)
  - created_at
  - unique (wishlist_id, user_id)

- share_links
  - id (uuid pk)
  - wishlist_id (uuid)
  - token_hash (text, unique)
  - mode (enum: view|shop|collab)
  - expires_at (timestamptz, nullable)
  - revoked_at (timestamptz, nullable)
  - created_at

- items
  - id (uuid pk)
  - wishlist_id (uuid)
  - title, description, notes
  - category (text), tags (text[])
  - priority (enum), quantity (int)
  - primary_url (text, nullable)
  - price_amount (numeric, nullable), price_currency (text, nullable)
  - is_reservable (bool)
  - is_draft (bool)
  - sort_index (int)
  - created_at, updated_at, archived_at

- item_links
  - id (uuid pk)
  - item_id (uuid)
  - url (text)
  - label (text)               # e.g., “Amazon”, “Local store”
  - last_seen_price (numeric), last_seen_currency (text), last_seen_at (timestamptz)
  - created_at

- item_images
  - id (uuid pk)
  - item_id (uuid)
  - storage_path (text)
  - created_at

- claims
  - id (uuid pk)
  - wishlist_id (uuid)
  - item_id (uuid)
  - claimer_user_id (uuid, nullable)     # null for guest
  - claimer_guest_id (uuid, nullable)    # references guests
  - state (enum: reserved|purchased|cancelled)
  - quantity (int)
  - created_at, updated_at

- guests
  - id (uuid pk)
  - display_name (text)
  - email_hash (text, nullable)
  - manage_token_hash (text, nullable)   # for “manage my reservation” links
  - created_at

- contributions
  - id (uuid pk)
  - wishlist_id (uuid)
  - item_id (uuid)
  - contributor_user_id (uuid, nullable)
  - contributor_guest_id (uuid, nullable)
  - amount (numeric)
  - currency (text)
  - note (text, nullable)
  - created_at

- suggestions
  - id (uuid pk)
  - wishlist_id (uuid)
  - item_payload (jsonb)        # suggested item shape
  - suggested_by_user_id (uuid)
  - visibility (enum: all_gifters|only_suggester)
  - created_at

- comments
  - id (uuid pk)
  - wishlist_id (uuid)
  - item_id (uuid, nullable)
  - author_user_id (uuid, nullable)
  - author_guest_id (uuid, nullable)
  - body (text)
  - created_at

- notifications
  - id (uuid pk)
  - user_id (uuid)
  - type (text), payload (jsonb)
  - read_at (timestamptz, nullable)
  - created_at

- audit_logs
  - id (uuid pk)
  - actor_user_id (uuid, nullable)
  - action (text)
  - target_type (text), target_id (uuid)
  - meta (jsonb)
  - created_at

## RLS policy sketch (high-level)

- profiles: user can read/write own; public profile read allowed if discovery enabled.
- wishlists/items: owner + collaborators can write; members can read; public reads only through share_links (recommended via server routes).
- claims:
  - gifter/guest can create/update own claim.
  - non-owner members can read availability state (not necessarily claimer identity).
  - owner cannot read claims unless spoiler_mode true (optional).
- contributions:
  - contributors can read/write own; owner can read aggregate amounts; identity visibility per settings.
- suggestions:
  - owner cannot read; gifters can read based on visibility; admin can read.
- audit_logs: append-only; read restricted to owner/admin.

## API surface (Next.js route handlers)

- Public/share:
  - GET /w/[shareToken] → render wishlist (guest-capable)
  - POST /api/w/[shareToken]/reserve
  - POST /api/w/[shareToken]/purchase
  - POST /api/w/[shareToken]/contribute
  - POST /api/w/[shareToken]/comment

- Authenticated:
  - GET /app → dashboard
  - CRUD /app/wishlists, /app/wishlists/[id]/items
  - POST /api/wishlists/[id]/share-links (create/rotate)
  - POST /api/wishlists/[id]/members (invite/update/remove)

- System:
  - POST /api/metadata/fetch → URL unfurling (SSRF protected)
  - POST /api/jobs/run → (optional) trigger scheduled jobs for ops/testing

## Storage buckets (Supabase)

- avatars/ (profile avatars)
- covers/ (wishlist covers)
- item-images/ (uploaded item photos)
- receipts/ (optional private receipts for claimers)

## Out of scope v1 (suggested)

- Built-in payments with automated reconciliation (Stripe) and refunds.
- Native mobile apps (iOS/Android) beyond PWA.
- Full external wishlist imports (Amazon, etc.) beyond CSV/manual.
- Personalized recommendation engine / ML.
- Full anti-circumvention guarantee for Surprise Mode (best-effort in UI and access control).

