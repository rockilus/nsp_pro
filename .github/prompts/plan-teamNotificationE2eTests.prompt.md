# Plan: Team Notification E2E Tests (active)

## TL;DR
Pure-API Playwright tests in `tests/e2e/settings/teams/team-notifications.spec.ts`. No page navigation. Each test uses `createAuthenticatedClientForUser()` to swap identities, triggers a team event via the real API, then fetches notifications as the target user to assert type and `eventData`. 5 methods added to `DatabaseTestUtils` to keep test files clean. `beforeEach` resets `["teams", "team_memberships", "team_invitations", "notifications"]` and creates a fresh team owned by TEST_USER.

---

## Phase 1 — Add helper methods to DatabaseTestUtils

**Step 1.** Add 5 methods to `DatabaseTestUtils` in [tests/utils/database-utils.ts](tests/utils/database-utils.ts). Each wraps an API static call using `createAuthenticatedClientForUser(userId)`:

- `createTeamInvitationAs(userId, teamId, email, type = "member")` → calls `TeamInvitationApi.createTeamInvitation(client, { email, type, ... }, teamId)` → returns `TeamInvitationT` (includes `token`)
- `acceptTeamInvitationAs(userId, token)` → calls `TeamInvitationApi.acceptTeamInvitation(client, token)` → returns `TeamWithMembershipT`
- `leaveTeamAs(userId, teamId)` → calls `TeamApi.leaveTeam(client, teamId)`
- `removeTeamMemberAs(actingUserId, teamId, targetUserId)` → calls `TeamApi.removeUserFromTeam(client, teamId, targetUserId)`
- `getNotificationsAs(userId)` → calls `NotificationApi.getMyNotifications(client)` → returns `NotificationT[]` (the `.notifications` array)

All import the API client classes that are already imported elsewhere in `database-utils.ts` (check existing import block first; `NotificationApi` and `TeamInvitationApi` may need to be added).

---

## Phase 2 — Write the test file

**Step 2.** Create `tests/e2e/settings/teams/team-notifications.spec.ts`.

**Test file structure:**

```
describe("Team notifications")
  beforeEach:
    - resetDatabase(["teams","team_memberships","team_invitations","notifications"])
    - team = await dbUtils.createTeam({ name: `Notif Team ${workerIndex}-${Date.now()}` })
      (createTeam internally uses TEST_USER as the owner)

  test 1: "invited user receives notification when invited to a team"
    - dbUtils.createTeamInvitationAs(TEST_USER.user_id, team.teamId, TEST_USER_2.email)
      → returns invitation (with token)
    - notifications = await dbUtils.getNotificationsAs(TEST_USER_2.user_id)
    - find notification with type === "user_received_team_invite"
    - assert: notification exists
    - assert: notification.eventData.team_name === team.name
    - assert: notification.eventData.sender_name === "Test User"

  test 2: "inviter is notified when invited user accepts the invitation"
    - invitation = await dbUtils.createTeamInvitationAs(TEST_USER.user_id, team.teamId, TEST_USER_2.email)
    - await dbUtils.acceptTeamInvitationAs(TEST_USER_2.user_id, invitation.token)
    - notifications = await dbUtils.getNotificationsAs(TEST_USER.user_id)
    - find notification with type === "user_accepted_team_invite"
    - assert: notification exists
    - assert: notification.eventData.accepted_user_name === "Test User2"
    - assert: notification.eventData.team_name === team.name

  test 3: "team owner is notified when a member leaves the team"
    - await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member")
      (bypass invite flow — directly insert membership)
    - await dbUtils.leaveTeamAs(TEST_USER_2.user_id, team.teamId)
    - notifications = await dbUtils.getNotificationsAs(TEST_USER.user_id)
    - find notification with type === "user_left_team"
    - assert: notification exists
    - assert: notification.eventData.member_name === "Test User2"
    - assert: notification.eventData.team_name === team.name

  test 4: "removed member is notified when kicked from the team"
    - await dbUtils.addTeamMember(TEST_USER_2.user_id, team.teamId, "member")
    - await dbUtils.removeTeamMemberAs(TEST_USER.user_id, team.teamId, TEST_USER_2.user_id)
    - notifications = await dbUtils.getNotificationsAs(TEST_USER_2.user_id)
    - find notification with type === "user_removed_from_team"
    - assert: notification exists
    - assert: notification.eventData.team_name === team.name
```

**Step 3.** Tests use no `{ page }` fixture — declare as `test('name', async () => { ... })`. If Playwright requires the fixture, declare but leave unused.

---

## Relevant files

- [tests/utils/database-utils.ts](tests/utils/database-utils.ts) — add 5 helper methods; check imports for `NotificationApi`, `TeamInvitationApi`
- `tests/e2e/settings/teams/team-notifications.spec.ts` — NEW: 4 tests
- [tests/utils/test-config.ts](tests/utils/test-config.ts) — reference for `devUserId`, `devUserId2`

---

## Verification

1. `npx playwright test tests/e2e/settings/teams/team-notifications.spec.ts --project=chromium` from `frontend/`
2. All 4 tests pass with correct notification type and `eventData` values
3. Run with `--reporter=list` to see per-test output if debugging

---

## Decisions

- API-only tests: no `page.goto`, no UI assertions — pure API calls via `createAuthenticatedClientForUser`
- `addTeamMember` (test-utils endpoint) used in tests 3 & 4 to insert membership directly — avoids the invite round-trip
- `createTeamInvitationAs`/`acceptTeamInvitationAs` deliberately use the real invitation API endpoints in tests 1 & 2 so the full notification code path is exercised
- `beforeEach` resets only the 4 relevant collections, not users — TEST_USER and TEST_USER_2 survive the reset
- Notification found by filtering `NotificationT[]` by type — no need for a separate unread-count assertion in these tests

---

# Plan: Team Notifications (completed)

## TL;DR
Add 4 new team notification types end-to-end using a cleaner `NotificationEvent` + `dispatch()` + `notification_builders.py` architecture. Instead of proliferating `notify_*` methods, call sites build events via pure builder functions and hand them to a single `dispatch()`. No DB schema change needed.

---

## Phase 1 — Shared schema: new NotificationTypes + NotificationEvent

**Step 1.** In `backend/shared/src/shared/schemas/core/notification.py`:
- Add 4 new values to `NotificationType` enum:
  - `TEAM_INVITE_RECEIVED = "team_invite_received"`
  - `TEAM_INVITE_ACCEPTED = "team_invite_accepted"`
  - `MEMBER_REMOVED = "member_removed"`
  - `MEMBER_LEFT = "member_left"`
- Add `NotificationEvent` dataclass:
  ```
  @dataclass
  class NotificationEvent:
      notification_type: NotificationType
      user_ids: list[str]
      team_id: str
      event_data: dict[str, Any]
  ```

---

## Phase 2 — NotificationService: replace notify_* with dispatch()

**Step 2.** Rewrite `backend/api_gateway/src/services/notification_service.py`:
- Remove all individual `notify_*` methods
- Add a single `dispatch(self, event: NotificationEvent) -> None` method:
  - Iterates `event.user_ids`, calls `self.create_notification(user_id, event.team_id, event.notification_type, event.event_data)` for each
  - Wraps each in `try/except Exception` with `logger.error` (same fire-and-forget pattern as existing `notify_*`)
- Any existing `notify_*` call sites in the codebase (e.g. `notify_swap_request`, `notify_assignment_change`) must be migrated to builders or left as-is until separately refactored — check existing usages to decide scope

**Step 3.** Create `backend/api_gateway/src/services/notification_builders.py` — pure functions, no side effects, each returns a single `NotificationEvent`:
- `team_invite_received_event(team_id, team_name, sender_name, invited_user_id) -> NotificationEvent`
- `team_invite_accepted_event(team_id, team_name, accepted_user_name, owner_user_ids) -> NotificationEvent`
- `member_removed_event(team_id, team_name, removed_user_id) -> NotificationEvent`
- `member_left_event(team_id, team_name, member_name, owner_user_ids) -> NotificationEvent`
- If existing `notify_*` logic is migrated: add corresponding builders for each existing type too

---

## Phase 3 — Call sites

**Step 4.** Update `backend/api_gateway/src/services/team_invitation_service.py`:
- In `create_team_invitation()`, after creating the invitation in DB: if the invited user has an account (look up `user_db.get_user_by_email(invitation.email)`), call `self.notification_service.dispatch(team_invite_received_event(...))`
- In `accept_team_invitation()`, after updating invitation status to ACCEPTED: fetch owner `user_ids`, call `self.notification_service.dispatch(team_invite_accepted_event(...))`

**Step 5.** Update `backend/api_gateway/src/services/team_service.py`:
- Pass `is_self_leave: bool` from the two existing routes to `remove_user_from_team`
- After deleting the membership:
  - If `is_self_leave`: fetch owner `user_ids`, call `dispatch(member_left_event(...))`
  - If not `is_self_leave`: call `dispatch(member_removed_event(...))` (for the removed user only)

**Step 6.** Inject `NotificationService` into `TeamInvitationService` and `TeamService` constructors (if not already present) and wire up in their dependency providers.

---

## Phase 4 — Translations

**Step 7.** Add new message keys to all 3 locales (`en`, `es`, `fr`):
- `"team_invite_received"`: "{{sender_name}} invited you to join {{team_name}}"
- `"team_invite_accepted"`: "{{accepted_user_name}} accepted your invitation to {{team_name}}"
- `"member_removed"`: "You have been removed from team {{team_name}}"
- `"member_left"`: "{{member_name}} left your team {{team_name}}"

Also add `"team_invite_received"` and `"member_removed"` accordion title keys for notification settings:
- `"email_team_invite_received"`: "Team invitation received"
- `"email_member_removed"`: "Removed from team"
- `"email_member_left"`: "Member left team"

---

## Phase 5 — Frontend notification type + registry

**Step 8.** Update `frontend/src/types/notification.ts`:
- Add `"team_invite_received"`, `"member_removed"`, `"member_left"` to `NotificationTypeT` union
- Add `"team_invite_received"`, `"member_removed"`, `"member_left"` to `NotificationKey` union + `NOTIFICATION_KEYS` array
- Add entries to `NOTIFICATION_REGISTRY`:
  - `team_invite_received`: `{ category: "team", visibleTo: [] }` (all roles — any user can be invited)
  - `team_invite_accepted`: already exists, no change needed
  - `member_removed`: `{ category: "team", visibleTo: [] }` (affects any member)
  - `member_left`: `{ category: "team", visibleTo: ["owner"] }` (owners only)

---

## Phase 6 — Frontend notification item rendering

**Step 9.** Update `frontend/src/components/notifications/notification-item.tsx` (or wherever `getMessageKey`/`getNotificationTargetPath` is defined) to handle the 4 new types:
- Map each new `NotificationType` value to its translation key
- `getNotificationTargetPath`: all 4 can route to `/${lng}/plan/settings/team` or the team page (TBD — link to team settings is safe default)

---

## Relevant files

- `backend/shared/src/shared/schemas/core/notification.py` — `NotificationType` enum + new `NotificationEvent` dataclass
- `backend/api_gateway/src/services/notification_service.py` — remove `notify_*`, add `dispatch(event: NotificationEvent)`
- `backend/api_gateway/src/services/notification_builders.py` — NEW: pure builder functions returning `NotificationEvent`
- `backend/api_gateway/src/services/team_invitation_service.py` — call sites (create + accept)
- `backend/api_gateway/src/services/team_service.py` — call sites (`remove_user_from_team` + `is_self_leave`)
- `backend/api_gateway/src/dependencies/` — DI wiring for `NotificationService` injection
- `frontend/src/types/notification.ts` — `NotificationTypeT`, `NotificationKey`, registry
- `frontend/src/app/i18n/locales/en/notifications.json`, `es/`, `fr/`
- `frontend/src/components/notifications/notification-item.tsx`

---

## Verification

1. `pytest -q` in `backend/api_gateway/` and `backend/shared/`
2. `./node_modules/.bin/tsc --noEmit` from `frontend/`
3. Manual smoke: invite a user → they receive an in-app notification; accept → owner receives notification; remove member → removed user notified; leave team → owners notified

---

## Decisions

- `dispatch()` + `NotificationEvent` + `notification_builders.py` chosen over individual `notify_*` methods — single extension point, pure builder functions with no side effects
- Team invite notification only sent if invited user already has an account (otherwise no user_id to notify)
- `member_left` is owner-only in the preference registry; `member_removed` is visible to all (the removed user needs to see/configure it)
- No email wiring in this plan — notification_service creates in-app only (matching current pattern), email bridging is a separate concern
