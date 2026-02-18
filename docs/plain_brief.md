# Wish List (Wishlist) Web App — plain brief (V1)

A web app where people create wishlists for occasions, share a public link, and friends reserve or group-fund gifts without duplicates.

The key product constraint is **surprise**: the wishlist owner must never see *who* reserved an item or *who/how much* contributed—only the item’s reserved status and funding progress.

## Scope split (important)

This **plain_brief** defines the **mandatory V1 behaviors** and product decisions. A separate **technical.md** will provide additional functions and deeper implementation details; treat those as an *extension* of this brief (not a replacement). If anything conflicts, this brief’s **Mandatory functionality** and **Surprise privacy** rules win.

## Context

Wishlists are often shared informally (messages, spreadsheets), which leads to duplicate purchases and awkward coordination. This app provides a clean public link for any occasion (birthday, New Year, wedding, etc.) where friends can coordinate in real time.

V1 targets: (1) create and share wishlists quickly, (2) prevent duplicates via reservations, (3) enable group contribution for expensive items, and (4) enforce privacy rules that preserve surprise.

## User roles

| Role | What they do | Must not be able to see |
|---|---|---|
| Wishlist owner | Create wishlists and items; share a link; track high-level status | Who reserved which item; who contributed and contribution amounts |
| Friend / gifter | View via public link; reserve items; contribute to group-funded items | Other friends’ personal data beyond what is required for coordination |
| Admin (operator) | Support, moderation, abuse handling (minimal in V1) | N/A |

## Mandatory functionality (must-have)

| Area | Mandatory behavior |
|---|---|
| Accounts | Email + password authentication (minimum). Owners must be authenticated to create/edit wishlists. |
| Wishlist creation | Owner can create multiple wishlists, each tied to an “occasion” (name + optional date + optional note). |
| Item management | Owner can add/edit/remove items with **title, URL, price, image**. Price stored as integer cents and displayed with a currency symbol. |
| Public sharing | Each wishlist has a **public link** that works without registration for viewing. Public link should be hard-to-guess (random token). |
| Public viewing UX | Visitors can view items, see availability/reserved state, and see funding progress on group-funded items. Mobile responsive. |
| Reservations | Friends can reserve an item to prevent duplicates. Reservation state is visible to other visitors in real time. |
| Surprise privacy | Owner sees only: (a) “Reserved” or “Available”, and (b) “Funded $X of $Y” with progress bar. Owner never sees reserver identity or contributor identities/amounts. |
| Group contributions | Any item can be marked as “Group funded” with a target amount (default = item price). Multiple friends can contribute their own amount. |
| Real-time updates | Reservation and contribution updates must broadcast instantly to all viewers without page refresh (mandatory, not optional). |
| Deployment | Entire system must be deployed and runnable end-to-end (they will register, create a wishlist, share, and test). |

## Product decisions (must be defined in V1)

**Empty-state UX (brand-new owner).** After signup, show a short onboarding flow: “Create your first wishlist” → “Add your first item” with a visually designed empty state (illustration, example cards, and one-click “Try with sample items” that the user can delete).

**Public access UX (no registration).** Public link opens a clean, read-only view by default. Any action (Reserve, Contribute) prompts a lightweight sign-in/sign-up (email + password) and then returns to the same item.

**Funding rules (minimum contribution).** Minimum contribution is **$1.00** (or currency equivalent) enforced server-side. Contributions are positive integers in cents; client-side validation mirrors server rules.

**Funding outcomes (target not reached).** Contributions are treated as **pledges** in V1 (no payment processing). If the target is not reached, the item remains “Open for contributions”; friends can keep contributing until the owner marks the item as “Purchased” or “No longer needed”.

**Edge cases.**
- If an item has any reservations or contributions, the owner cannot hard-delete it. Instead, they can “Archive item” (removes it from public view), which preserves an audit record and prevents silent loss of coordination.
- If an archived item has contributions, contributors can still view their pledge history (private to them) and the item shows “Archived by owner”.
- If the owner changes price/target after contributions, the target updates, but historical contribution amounts remain unchanged; the progress bar recalculates against the new target.

## Bonus (plus)

**URL autofill.** Pasting a product URL should auto-fetch title, primary image, and best-effort price (when available). If extraction fails, the user can fill fields manually.

## Tech stack requirements

| Layer | Requirement |
|---|---|
| Frontend | Next.js (App Router acceptable) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + password minimum) |
| Real-time | Supabase Realtime (or equivalent) powering reservations + contributions live updates |
| Backend | Flexible: Next.js API routes and/or a small service (e.g., FastAPI) for URL metadata fetch + sanitization |

Optional: OpenAI API can be integrated if provided (e.g., smarter URL parsing, gift suggestions), but it must not be required for core flows.

## Screens (V1)

| Screen | Purpose |
|---|---|
| Auth + onboarding | Create account, first wishlist, first item, empty-state guidance |
| Owner: My wishlists | List/create wishlists; quick share link; status summaries |
| Owner: Wishlist editor | Add/edit items; toggle group funding; archive items; share link |
| Public wishlist view | Mobile-first list of items, reserve buttons, funding progress bars |
| Item action modal | Reserve/unreserve; contribute amount; show your own history |

## Design frame

The UI must look finished: consistent spacing, strong typography, and polished states (loading, error, empty). Use subtle micro-interactions (hover/focus/press) and ensure accessibility basics (keyboard navigation, readable contrast).

Mobile responsiveness is mandatory: public view and item actions must work comfortably on phones.

## Out of scope for this brief (V1)

OAuth login (nice-to-have), payments/checkout, refunds, shipping tracking, multi-owner shared editing, complex moderation tooling, native mobile apps.

## Evaluation criteria (what “good” looks like)

Product decisions are coherent (especially edge cases), real-time behavior is reliable, default styling is tasteful, and the app is deployed and testable end-to-end. The build process should clearly demonstrate AI-assisted workflow in the project video.
