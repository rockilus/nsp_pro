# Plan: Notification Management System

## TL;DR
Full-stack notification system — per-user MongoDB notifications, standalone bell icon+popover in NavAppBar, clickable notifications that navigate to relevant pages, notification settings with master + per-type email toggles, and email delivery via the existing EmailQueueService/SQS infrastructure. Badge updates via 30s client-side polling.

---

## User decisions
- Push strategy: polling (30s)
- Notification recipients:
  - Schedule published → all team workers with a linked `user_id`
  - New swap request → targeted worker (DIRECT) or team owner (OPEN) + team owner
  - Request status changed → requesting worker
  - Assignment change → affected worker
- Email settings: master on/off toggle + per-type overrides
- Notification retention: indefinite (manual delete only)
- Badge & popover: standalone bell icon in NavAppBar, NOT inside AccountMenu

---

## Architecture decisions
- Notifications are **user-scoped** (`user_id`-indexed)
- `event_data` is a **language-independent Dict** (IDs + names at event time) — frontend renders all text via i18n interpolation at display time
- One notification created per event, immediately, no deferred queue
- Bell icon popover shows 5 most recent + "See all" link
- Clickable notifications: URL derived at frontend by `getNotificationTargetPath(notification, lng)` — no URL stored in DB
- Swap: existing swap emails (`SWAP_INVITATION/BID/APPROVED`) must not be duplicated — consolidate into notification preferences system during Phase 3

## Event Data (language-independent)
```
SCHEDULE_PUBLISHED:     { schedule_id, schedule_name, published_by, team_name }
NEW_SWAP_REQUEST:       { swap_id, requester_name, date, team_name }
SWAP_STATUS_CHANGED:    { swap_id, new_status, team_name }
REQUEST_STATUS_CHANGED: { request_id, new_status, shift_name, date, team_name }
ASSIGNMENT_CHANGED:     { assignment_id, shift_name, date, changed_by }
```

## Navigation target mapping (frontend-derived)
```
SCHEDULE_PUBLISHED     → /{lng}/plan/schedule?scheduleId={schedule_id}
NEW_SWAP_REQUEST       → /{lng}/plan/swaps
SWAP_STATUS_CHANGED    → /{lng}/plan/swaps
REQUEST_STATUS_CHANGED → /{lng}/plan/requests
ASSIGNMENT_CHANGED     → /{lng}/plan/schedule
```

---

## Steps

### Phase 1: Backend — Shared Models & DB

1. Create `backend/shared/src/shared/schemas/core/notification.py`
   - `NotificationType` enum: `SCHEDULE_PUBLISHED`, `NEW_SWAP_REQUEST`, `SWAP_STATUS_CHANGED`, `REQUEST_STATUS_CHANGED`, `ASSIGNMENT_CHANGED`
   - `Notification` dataclass: `id`, `user_id`, `team_id`, `type: NotificationType`, `event_data: Dict`, `read: bool`, `created_at`, `updated_at`, `read_at: Optional[datetime]`
   - `NotificationDTO` Pydantic model (camelCase)

2. Create `backend/shared/src/shared/schemas/core/notification_preferences.py`
   - `NotificationPreferences` dataclass: `user_id`, `email_enabled: bool`, `email_schedule_published: bool`, `email_swap_requests: bool`, `email_request_decisions: bool`, `email_assignment_changes: bool`
   - `NotificationPreferencesDTO` Pydantic model

3. Add 4 new `EmailType` values to `backend/shared/src/shared/schemas/core/email.py`:
   `NOTIFICATION_SCHEDULE_PUBLISHED`, `NOTIFICATION_REQUEST_DECISION`, `NOTIFICATION_SWAP_REQUEST`, `NOTIFICATION_ASSIGNMENT_CHANGED`

4. Create MongoDB schemas + repositories:
   - `backend/shared/src/shared/database/schemas/notification.py` — `NotificationSchema` with `.to_core()` / `.from_core()`
   - `backend/shared/src/shared/database/schemas/notification_preferences.py`
   - `backend/shared/src/shared/database/repositories/notification.py` — `NotificationRepository`:
     - `get_by_user_id(user_id, limit, skip)`, `get_unread_count(user_id)`, `mark_read(id)`, `mark_all_read(user_id)`
   - `backend/shared/src/shared/database/repositories/notification_preferences.py`:
     - `get_or_create_default(user_id)`, `update(user_id, prefs)`

5. Update `backend/shared/src/shared/database/database_collections.py` — add `notification_db`, `notification_preferences_db`

6. Add DB migration `database_migration/migrations/{timestamp}-add_notifications_collections.js`:
   - `notifications` collection: indexes `{ user_id: 1, read: 1, created_at: -1 }`
   - `notification_preferences` collection: unique index on `user_id`

---

### Phase 2: Backend — API Layer (*parallel with Phase 1 after step 5*)

7. Create `backend/api_gateway/src/services/notification_service.py` — `NotificationService`:
   - `create_notification(user_id, team_id, type, event_data)` — creates `Notification` in DB; checks preferences and enqueues email via `EmailQueueService` if the relevant type is enabled
   - `get_user_notifications(user_id, limit, skip)` → `{ notifications, unread_count }`
   - `get_unread_count(user_id)`
   - `mark_read(notification_id, user_id)` — verifies ownership
   - `mark_all_read(user_id)`
   - `delete(notification_id, user_id)` — verifies ownership

8. Create `backend/api_gateway/src/routes/notification_routes.py`:
   - `GET /notifications/me` — paginated list + unread_count
   - `GET /notifications/me/unread-count` — lightweight for badge polling
   - `PUT /notifications/{id}/read`
   - `POST /notifications/me/read-all`
   - `DELETE /notifications/{id}`

9. Create `backend/api_gateway/src/services/notification_preferences_service.py` + `backend/api_gateway/src/routes/notification_preferences_routes.py`:
   - `GET /users/me/notification-preferences`
   - `PUT /users/me/notification-preferences`

10. Create DI files `backend/api_gateway/src/dependencies/notification_service.py` and `notification_preferences_service.py`; register both routers in `main.py`

---

### Phase 3: Backend — Event Hooks (*depends on Phase 2*)

11. **Schedule published**: In schedule service — fetch all team workers with `user_id`, call `notification_service.create_notification()` for each

12. **Swap request created**: In swap service — call `create_notification()` for target worker / team owner; audit existing `SWAP_INVITATION` email path to avoid duplication

13. **Request status changed**: In request service — map `request.worker_id → user_id`, call `create_notification()`

14. **Assignment changed**: In assignment service — find worker's `user_id`, call `create_notification()`

---

### Phase 4: Frontend — Data Layer (*parallel with Phase 2*)

15. Create `frontend/src/types/notification.ts`:
    - `NotificationTypeT`, `NotificationT`, `NotificationPreferencesT`; `toNotificationT` / `fromNotificationT` converters

16. Create `frontend/src/app/lib/api/notificationApi.ts` extending `BaseApi`:
    - `getMyNotifications(client, limit, skip)` → `{ notifications: NotificationT[], unreadCount: number }`
    - `getUnreadCount(client)` → `{ count: number }`
    - `markRead(client, id)`, `markAllRead(client)`, `deleteNotification(client, id)`
    - `getNotificationPreferences(client)`, `updateNotificationPreferences(client, prefs)`

17. Create `frontend/src/app/lib/hooks/useNotifications.ts`:
    - `notificationKeys` query key factory
    - `useUnreadNotificationCount()` — `refetchInterval: 30000`
    - `useNotifications(limit, skip)` — paginated query
    - `useMarkNotificationRead()`, `useMarkAllNotificationsRead()`, `useDeleteNotification()` — mutations with query invalidation
    - `useNotificationPreferences()` + `useUpdateNotificationPreferences()`

18. Create `frontend/src/app/lib/utils/getNotificationTargetPath.ts`:
    - `getNotificationTargetPath(notification: NotificationT, lng: string): string` mapping `type + event_data` → URL

19. Add i18n namespace `notifications` in `frontend/src/app/i18n/locales/{en,fr,es}/notifications.json`:
    - Keys: `title`, `mark_all_read`, `no_notifications`, `see_all`, per-type message templates with i18next interpolation variables, settings-related keys

---

### Phase 5: Frontend — UI (*depends on Phase 4*)

20. **NotificationItem component** `frontend/src/components/notifications/notification-item.tsx`:
    - Props: `notification: NotificationT`, `lng: string`, `onRead?: (id) => void`, `onDelete?: (id) => void`, `compact?: boolean`
    - Wraps in Next.js `Link` using `getNotificationTargetPath()`; click marks as read + navigates
    - Unread: light background + bold text; compact mode for popover (no delete button)

21. **NotificationBell component** `frontend/src/components/app-bar/notification-bell.tsx`:
    - `useUnreadNotificationCount()` for badge (30s polling); `useNotifications(5, 0)` for popover content
    - MUI `IconButton` + `Badge` (red, hidden at 0, capped 99+) + `NotificationsIcon`
    - Opens MUI `Popover` (anchorOrigin bottom/right, transformOrigin top/right — same anchor pattern as existing `AccountMenu` popover)
    - Popover: "Notifications" header + "Mark all read" button; 5 compact `NotificationItem`s; "See all" link to `/{lng}/plan/notifications`; empty state text

22. **Update NavAppBar** `frontend/src/components/app-bar/nav-app-bar.tsx`:
    - Wrap `<NotificationBell lng={lng} />` + `<AccountMenu lng={lng} />` in a shared right-side `<div style={{display:"flex",alignItems:"center",gap:4}}>`
    - The existing `.app-bar-content-container` (`space-between`) keeps logo left / NavLinks centre / right group right

23. **Notifications page** `frontend/src/app/[lng]/plan/notifications/page.tsx` + `frontend/src/components/notifications/notifications-page.tsx`:
    - Two sections: "Unread" (highlighted) → "Read"
    - "Mark all as read" button; delete icon per row; empty state
    - Full `NotificationItem` (not compact)

24. **Notification settings page** `frontend/src/app/[lng]/plan/settings/notifications/page.tsx` + `frontend/src/components/settings/notifications/notification-settings-tab.tsx`:
    - Master email `Switch` + 4 per-type `Switch` controls (sub-toggles disabled when master off)
    - `SnackBarComponent` for save feedback, consistent with existing settings tabs

25. **Update settings nav** `frontend/src/components/settings/settings-links.ts`:
    - Add `{ name: "notifications", href: "/{lng}/plan/settings/notifications", label: t("notifications") }`
    - Add `"notifications"` key to `profile-page.json` and `app-bar.json` in en/fr/es

---

## Relevant Files

**Backend — new:**
- `backend/shared/src/shared/schemas/core/notification.py`
- `backend/shared/src/shared/schemas/core/notification_preferences.py`
- `backend/shared/src/shared/database/schemas/notification.py`, `notification_preferences.py`
- `backend/shared/src/shared/database/repositories/notification.py`, `notification_preferences.py`
- `backend/api_gateway/src/services/notification_service.py`
- `backend/api_gateway/src/services/notification_preferences_service.py`
- `backend/api_gateway/src/routes/notification_routes.py`
- `backend/api_gateway/src/routes/notification_preferences_routes.py`
- `backend/api_gateway/src/dependencies/notification_service.py`, `notification_preferences_service.py`
- `database_migration/migrations/{timestamp}-add_notifications_collections.js`

**Backend — modified:**
- `backend/shared/src/shared/schemas/core/email.py` — 4 new EmailType values
- `backend/shared/src/shared/database/database_collections.py` — 2 new repos
- `backend/api_gateway/src/routes/schedule_routes.py` (or service) — Phase 3 hook
- `backend/api_gateway/src/routes/swap_routes.py` (or service) — Phase 3 hook
- `backend/api_gateway/src/routes/request_routes.py` (or service) — Phase 3 hook
- `backend/api_gateway/src/routes/assignment_routes.py` (or service) — Phase 3 hook
- `backend/api_gateway/src/main.py` — register 2 new routers

**Frontend — new:**
- `frontend/src/types/notification.ts`
- `frontend/src/app/lib/api/notificationApi.ts`
- `frontend/src/app/lib/hooks/useNotifications.ts`
- `frontend/src/app/lib/utils/getNotificationTargetPath.ts`
- `frontend/src/components/notifications/notification-item.tsx`
- `frontend/src/components/notifications/notifications-page.tsx`
- `frontend/src/components/app-bar/notification-bell.tsx`
- `frontend/src/app/[lng]/plan/notifications/page.tsx`
- `frontend/src/components/settings/notifications/notification-settings-tab.tsx`
- `frontend/src/app/[lng]/plan/settings/notifications/page.tsx`
- `frontend/src/app/i18n/locales/{en,fr,es}/notifications.json`

**Frontend — modified:**
- `frontend/src/components/app-bar/nav-app-bar.tsx` — add NotificationBell, wrap right icons
- `frontend/src/components/settings/settings-links.ts` — add notifications link
- `frontend/src/app/i18n/locales/{en,fr,es}/profile-page.json` — add "notifications" key
- `frontend/src/app/i18n/locales/{en,fr,es}/app-bar.json` — add "notifications" key

---

## Verification

1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd backend && pytest api_gateway/tests/` — all pass
3. Unit tests for `NotificationService.create_notification()`: creates DB record; enqueues email when prefs enabled; skips email when disabled
4. `make solve_service_check_no_test` — no regression
5. Smoke: publish schedule → workers' badges increment; approve request → notification in list; clicking notification opens correct page + marks read; toggle email off → no email; bell popover shows 5 items + "See all"; all 3 languages render correctly

---

## Further Considerations

1. **Worker→User mapping**: Confirm `Worker` schema has `user_id` before Phase 3; if not, bridge via `team_membership_db`
2. **Swap email deduplication**: Audit existing `SWAP_INVITATION/BID/APPROVED` email path — consolidate into notification preferences so both paths don't fire simultaneously
