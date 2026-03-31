# Plan: Swap Notifications (11 new types)

## TL;DR
Replace the two generic swap notification types (`NEW_SWAP_REQUEST`, `SWAP_STATUS_CHANGED`) with 11 granular types covering the full swap lifecycle. New route `POST /swaps/{swap_id}/refuse` enables targets to refuse direct swaps. 11 individual preference keys (one per type), matching existing assignment-level granularity.

---

## New Notification Types (replaces NEW_SWAP_REQUEST + SWAP_STATUS_CHANGED)

| Type | Trigger | Recipient | event_data |
|---|---|---|---|
| `user_created_direct_swap` | `create_swap_request(DIRECT)` | target worker's user | swap_id, requester_name, shift_name, date, team_name |
| `user_accepted_direct_swap` | `accept_direct_swap()` | created_by_user_id | swap_id, target_name, shift_name, date, team_name |
| `user_refused_direct_swap` | NEW `refuse_direct_swap()` | created_by_user_id | swap_id, refuser_name, shift_name, date, team_name |
| `user_created_open_swap` | `create_swap_request(OPEN)` | all team members except creator | swap_id, requester_name, shift_name, date, team_name |
| `user_bid_open_swap` | `add_bid_to_open_swap()` | created_by_user_id | swap_id, bidder_name, shift_name, date, team_name |
| `user_selected_bid_open_swap` | `accept_bid_on_open_swap()` | accepted bidder's user | swap_id, requester_name, shift_name, date, team_name |
| `user_selected_other_bid_open_swap` | `accept_bid_on_open_swap()` | all other (non-selected) bidders' users | swap_id, shift_name, date, team_name |
| `swap_ready_for_review` | `accept_direct_swap()` + `accept_bid_on_open_swap()` | all team managers/owners | swap_id, requester_name, shift_name, date, team_name, swap_type |
| `user_validated_swap` | `approve_swap()` | both swap parties (2 separate notifs) | swap_id, own_shift_name, own_date, other_shift_name, other_date, team_name |
| `user_denied_swap` | `deny_swap()` | both swap parties | swap_id, shift_name, date, team_name |
| `user_reversed_swap` | `revert_swap()` | both swap parties (2 separate notifs) | swap_id, own_shift_name, own_date, other_shift_name, other_date, team_name |

11 new NotificationKey values (individual, one per type). `swap_ready_for_review` gets `visible_to: {"manager", "owner"}`.

---

## Phase 1: Backend Shared — Core Types (parallel-safe)

1. **`notification.py`** — Remove `NEW_SWAP_REQUEST`, `SWAP_STATUS_CHANGED`; add 11 new `NotificationType` values
2. **`notification_preferences.py`** — Remove `SWAP_REQUESTS`; add 11 new `NotificationKey` values with `visible_to` for `SWAP_READY_FOR_REVIEW`
3. **`email.py`** — Remove `NOTIFICATION_SWAP_REQUEST`, `NOTIFICATION_SWAP_STATUS_CHANGED`; add 11 new `EmailType` values

## Phase 2: Backend API Gateway — New Route (depends on Phase 1)

4. **`swap_service.py`** — Add `refuse_direct_swap(swap_id, refuser_user_id) → SwapRequest` (validates refuser is the target, sets status=DENIED)
5. **`swap_routes.py`** — Add `POST /swaps/{swap_id}/refuse` (accessible to target worker, not leader-only)

## Phase 3: Backend API Gateway — Notification Builders (depends on Phase 1, parallel with Phase 2)

6. **`notification_builders.py`** — Add 11 new pure builder functions; each returns a `NotificationEvent`

## Phase 4: Backend API Gateway — Notification Service (depends on Phase 1 + 3)

7. **`notification_service.py`**:
   - Remove `notify_new_swap_request()` method
   - Remove `NEW_SWAP_REQUEST`, `SWAP_STATUS_CHANGED` from `_NOTIFICATION_TYPE_TO_KEY`
   - Add all 11 new types to `_NOTIFICATION_TYPE_TO_KEY`
   - Add new notify methods called by swap_service:
     - `notify_swap_created(swap)` — dispatches `user_created_direct_swap` OR `user_created_open_swap`
     - `notify_direct_swap_accepted(swap)` — dispatches `user_accepted_direct_swap` + `swap_ready_for_review`
     - `notify_direct_swap_refused(swap)` — dispatches `user_refused_direct_swap`
     - `notify_bid_added(swap, bid)` — dispatches `user_bid_open_swap`
     - `notify_bid_accepted(swap, bid)` — dispatches `user_selected_bid_open_swap` + `user_selected_other_bid_open_swap` (to all other bidders) + `swap_ready_for_review`
     - `notify_swap_validated(swap)` — dispatches `user_validated_swap` to both parties
     - `notify_swap_denied(swap)` — dispatches `user_denied_swap` to both parties
     - `notify_swap_reversed(swap)` — dispatches `user_reversed_swap` to both parties

## Phase 5: Backend API Gateway — Swap Service Wiring (depends on Phase 2 + 4)

8. **`swap_service.py`** — Replace `notify_new_swap_request()` call; add notification calls in:
   - `create_swap_request()` → `notify_swap_created()`
   - `accept_direct_swap()` → `notify_direct_swap_accepted()`
   - `refuse_direct_swap()` (new) → `notify_direct_swap_refused()`
   - `add_bid_to_open_swap()` → `notify_bid_added()`
   - `accept_bid_on_open_swap()` → `notify_bid_accepted()`
   - `approve_swap()` → `notify_swap_validated()`
   - `deny_swap()` → `notify_swap_denied()`
   - `revert_swap()` → `notify_swap_reversed()`

## Phase 6: Backend API Gateway — Email Config (depends on Phase 1)

9. **`notification_email_config.py`** — Remove old swap entries; add 11 new entries, all pointing to `/plan/swaps`

## Phase 7: Frontend — Types (depends on Phase 1 for alignment, independent otherwise)

10. **`frontend/src/types/notification.ts`**:
    - `NotificationTypeT`: remove `new_swap_request`, `swap_status_changed`; add 11 new string literals
    - `NotificationKey`: remove `swap_requests`; add 11 new strings
    - `NOTIFICATION_KEYS`: update array
    - `NOTIFICATION_REGISTRY`: add entries with `category: "swaps"` (new category)
    - `NOTIFICATION_CATEGORY_ORDER`: add `"swaps"`

## Phase 8: Frontend — Display Components (depends on Phase 7)

11. **`notification-item.tsx`** — Extend `getMessageKey()` switch: remove `new_swap_request`/`swap_status_changed` cases, add 11 new cases
12. **`getNotificationTargetPath.ts`** — Remove old swap cases, add 11 new swap types all routing to `/plan/swaps?swapId=...`

## Phase 9: Frontend — i18n Translations (depends on Phase 7, parallel with Phase 8)

13. **`en/notifications.json`** — Remove old swap keys, add 11 new message strings + email label strings + `category_swaps` label
14. **`es/notifications.json`**, **`fr/notifications.json`** — Mirror of English changes

## Phase 10: E2E Tests — Database Utilities (depends on Phase 2)

15. **`frontend/tests/utils/database-utils.ts`** — Add:
    - `refuseDirectSwapAs(userId, swapId)` → calls POST /swaps/{swap_id}/refuse
    - `denySwapAs(userId, swapId)` → calls POST /swaps/{swap_id}/deny

## Phase 11: E2E Tests — Swap Notifications Spec (depends on Phase 10 + full backend)

16. **`frontend/tests/e2e/swaps/swap-notifications.spec.ts`** (NEW) — Mirror of `team-notifications.spec.ts`. Uses beforeEach to reset collections: `swaps`, `notifications`, `assignments`, etc.

Test scenarios:
1. Target receives `user_created_direct_swap` when creator creates a direct swap for them
2. Creator receives `user_accepted_direct_swap` when target accepts the direct swap
3. Creator receives `user_refused_direct_swap` when target refuses the direct swap
4. All team members receive `user_created_open_swap` when an open swap is created
5. Creator receives `user_bid_open_swap` when someone bids on their open swap
6. Bidder receives `user_selected_bid_open_swap` when swap creator accepts their bid
7. Other bidders receive `user_selected_other_bid_open_swap` when a different bid is accepted
8. Team leaders receive `swap_ready_for_review` when any swap enters pending_approval (direct: after accept; open: after bid accepted)
9. Both swap parties receive `user_validated_swap` when leader approves the swap
10. Both swap parties receive `user_denied_swap` when leader denies the swap
11. Both swap parties receive `user_reversed_swap` when leader reverses a completed swap

## Phase 12: E2E Tests — Notification Content (depends on Phase 11 infrastructure + Phase 9)

17. **`frontend/tests/e2e/notifications/notification-content.spec.ts`** — Add 11 new entries to `NOTIFICATION_TEST_CASES`:
    - Each entry: type, description, preferenceKey, recipientRole, setup(), expectedText(), expectedUrlPattern

---

## Relevant Files

- `backend/shared/src/shared/schemas/core/notification.py` — NotificationType enum
- `backend/shared/src/shared/schemas/core/notification_preferences.py` — NotificationKey enum + visible_to logic
- `backend/shared/src/shared/schemas/core/email.py` — EmailType enum
- `backend/api_gateway/src/services/notification_builders.py` — pure builder factories (pattern: each builder returns NotificationEvent with typed event_data)
- `backend/api_gateway/src/services/notification_service.py` — dispatch + notify_* methods; `_NOTIFICATION_TYPE_TO_KEY` dict
- `backend/api_gateway/src/services/swap_service.py` — already has `self.notification_service`; only `create_swap_request()` currently calls it
- `backend/api_gateway/src/routes/swap_routes.py` — add `/refuse` route
- `backend/api_gateway/src/services/notification_email_config.py` — NOTIFICATION_EMAIL_MAP
- `frontend/src/types/notification.ts` — all type defs + NOTIFICATION_KEYS, NOTIFICATION_REGISTRY
- `frontend/src/components/notifications/notification-item.tsx` — getMessageKey() switch
- `frontend/src/app/lib/utils/getNotificationTargetPath.ts` — URL routing per type
- `frontend/src/app/i18n/locales/en/notifications.json` (+ es, fr)
- `frontend/tests/utils/database-utils.ts` — new refuseDirectSwapAs(), denySwapAs()
- `frontend/tests/e2e/swaps/swap-notifications.spec.ts` — NEW file
- `frontend/tests/e2e/notifications/notification-content.spec.ts` — extend NOTIFICATION_TEST_CASES

---

## Verification

1. Run `pytest -q` in `backend/api_gateway` and `backend/shared` — confirms no broken imports from enum removals
2. Run `npx tsc --noEmit` from `frontend/` — confirms TypeScript types align
3. Do NOT run Playwright e2e tests

---

## Decisions

- `user_refused_direct_swap` is the correct name (not `user_denied_direct_swap`) — user confirmed
- New backend route: `POST /swaps/{swap_id}/refuse` (target-accessible, sets status=DENIED)
- 11 individual preference keys (one per type), matching the existing assignment key granularity
- `swap_ready_for_review` gets `visible_to: {"manager", "owner"}` in NotificationPreferences
- `NEW_SWAP_REQUEST` and `SWAP_STATUS_CHANGED` fully removed from enum, email config, and service
- `SWAP_REQUESTS` preference key removed, replaced by the 11 new individual keys
- New notification category `"swaps"` added to the frontend `NotificationCategory` type and `NOTIFICATION_REGISTRY`
- For `user_validated_swap` and `user_reversed_swap`: each party gets a distinct notification with `own_shift_name/own_date/other_shift_name/other_date` so the display can say "Your shift X on Y was swapped with Z's shift A on B"
- URL routing for all new swap types: `/plan/swaps?swapId={swap_id}` when swap_id is in event_data

## Out of Scope

- Email HTML template files (email templates for new types would still reference the new EmailType values — actual template HTML is outside this plan)
- Existing swap-related UI changes beyond notification display
- Migration of existing notifications with `new_swap_request` / `swap_status_changed` types in DB
