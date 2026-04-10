# Plan: Schedule & Assignment Notifications Refactor

## TL;DR
Replace the existing `schedule_published` + `assignment_changed` notification types with four new types: `user_published_schedule`, `user_created_assignment`, `user_updated_assignment`, `user_deleted_assignment`. Assignment notifications only fire when the assignment belongs to a validated (published) schedule. Updates touch shared schemas, API Gateway service + routes, frontend types + i18n + components, email config, email templates, and E2E tests.

---

## Phase 1 — Backend Shared Schemas (no service deps)

**Step 1** — `backend/shared/src/shared/schemas/core/notification.py`
- Remove: `SCHEDULE_PUBLISHED`, `ASSIGNMENT_CHANGED`
- Add: `USER_PUBLISHED_SCHEDULE = "user_published_schedule"`, `USER_CREATED_ASSIGNMENT = "user_created_assignment"`, `USER_UPDATED_ASSIGNMENT = "user_updated_assignment"`, `USER_DELETED_ASSIGNMENT = "user_deleted_assignment"`

**Step 2** — `backend/shared/src/shared/schemas/core/notification_preferences.py`
- Rename key: `SCHEDULE_PUBLISHED` → `USER_PUBLISHED_SCHEDULE = "user_published_schedule"`
- Keep `ASSIGNMENT_CHANGES` (controls all 3 new assignment types as a group)
- Update `NOTIFICATION_REGISTRY`: replace `NotificationKey.SCHEDULE_PUBLISHED` entry with `NotificationKey.USER_PUBLISHED_SCHEDULE`

**Step 3** — `backend/shared/src/shared/schemas/core/email.py`
- Remove: `NOTIFICATION_SCHEDULE_PUBLISHED`, `NOTIFICATION_ASSIGNMENT_CHANGED`
- Add: `NOTIFICATION_USER_PUBLISHED_SCHEDULE`, `NOTIFICATION_USER_CREATED_ASSIGNMENT`, `NOTIFICATION_USER_UPDATED_ASSIGNMENT`, `NOTIFICATION_USER_DELETED_ASSIGNMENT`

---

## Phase 2 — Backend API Gateway Services (depends on Phase 1)

**Step 4** — `backend/api_gateway/src/services/notification_builders.py`
- Remove existing schedule builder (if any standalone function existed for the old type)
- Add pure factory functions:
  - `user_published_schedule_event(team_id, team_name, schedule_id, schedule_name, worker_user_ids)` → `NotificationEvent(USER_PUBLISHED_SCHEDULE, ...)`
  - `user_created_assignment_event(team_id, team_name, worker_user_id, shift_name, date)` → `NotificationEvent(USER_CREATED_ASSIGNMENT, ...)`
  - `user_updated_assignment_event(team_id, team_name, worker_user_id, shift_name, date)` → `NotificationEvent(USER_UPDATED_ASSIGNMENT, ...)`
  - `user_deleted_assignment_event(team_id, team_name, worker_user_id, shift_name, date)` → `NotificationEvent(USER_DELETED_ASSIGNMENT, ...)`

**Step 5** — `backend/api_gateway/src/services/notification_email_config.py`
- Remove entries for `SCHEDULE_PUBLISHED`, `ASSIGNMENT_CHANGED` from `NOTIFICATION_EMAIL_MAP`
- Add entries for 4 new types mapping to (new_template_name, new_EmailType, app_path):
  - `USER_PUBLISHED_SCHEDULE` → `("notification_user_published_schedule_email", NOTIFICATION_USER_PUBLISHED_SCHEDULE, "/plan/schedule")`
  - `USER_CREATED_ASSIGNMENT` → same pattern → `/plan/schedule`
  - `USER_UPDATED_ASSIGNMENT` → same → `/plan/schedule`
  - `USER_DELETED_ASSIGNMENT` → same → `/plan/schedule`
- Remove old subjects in `NOTIFICATION_SUBJECTS`; add new en/es/fr entries for all 4 types

**Step 6** — `backend/api_gateway/src/services/notification_service.py`
- Update `_NOTIFICATION_TYPE_TO_KEY`:
  - Remove: `SCHEDULE_PUBLISHED → SCHEDULE_PUBLISHED`, `ASSIGNMENT_CHANGED → ASSIGNMENT_CHANGES`
  - Add: `USER_PUBLISHED_SCHEDULE → USER_PUBLISHED_SCHEDULE`, all 3 assignment types → `ASSIGNMENT_CHANGES`
- Remove methods: `notify_schedule_published`, `notify_assignment_changed`
- Add method: `notify_schedule_published(schedule)` — iterates workers with `user_id`, calls `dispatch(user_published_schedule_event(...))`
- Add dataclass `AssignmentOperation(before: Assignment | None, after: Assignment | None)` (either `before` or `after` must be set)
- Add method: `notify_assignment_crud(ops: list[AssignmentOperation], team_id: str)`:
  - For each op, determine what to notify:
    - **Create** (`before=None`): schedule check on `after`; if published, emit `USER_CREATED_ASSIGNMENT` for `after.worker_id`'s user
    - **Delete** (`after=None`): schedule check on `before`; if published, emit `USER_DELETED_ASSIGNMENT` for `before.worker_id`'s user
    - **Update** (`before` and `after` both set):
      - If `before.worker_id != after.worker_id`: schedule check on `after`; if published, emit `USER_DELETED_ASSIGNMENT` for old worker's user AND `USER_CREATED_ASSIGNMENT` for new worker's user
      - Elif `before.shift_id != after.shift_id` OR `before.date != after.date`: schedule check on `after`; if published, emit `USER_UPDATED_ASSIGNMENT` for `after.worker_id`'s user
      - Else (only non-schedule fields changed, e.g. `fixed`): **no notification**
  - **Published-period check** (per assignment): query schedules for `team_id` where `schedule.start_date ≤ assignment.date ≤ schedule.end_date`. If a matching schedule exists AND its `status != VALIDATED` → skip (assignment is inside an unpublished campaign). If **no** matching schedule is found → proceed with notification (assignment outside any campaign = treated as published). Only suppress when a schedule explicitly owns that date but hasn't been validated yet.
  - **De-duplicate per user**: accumulate all (user_id, type, event_data) tuples across the entire ops list; call `dispatch()` once per unique user_id — one notification per user per operation type (for bulk ops multiple assignments affecting the same user collapse into one)

**Step 7** — `backend/api_gateway/src/routes/assignment_routes.py`
- Pre-fetch assignment data before mutations where needed (delete/update need `before` state):
  - `DELETE` (single): fetch assignment from DB before calling service delete
  - `PUT` (single): fetch assignment from DB before calling service update
  - Bulk `PUT` / `DELETE`: pre-fetch all affected assignments before calling bulk service method
- After each service call, build `AssignmentOperation` list and pass to a single `await notification_service.notify_assignment_crud(ops, team_id)`:
  - `POST` (create single): `[AssignmentOperation(before=None, after=created)]`
  - `PUT` (update single): `[AssignmentOperation(before=original, after=updated)]`
  - `DELETE` (delete single): `[AssignmentOperation(before=original, after=None)]`
  - Bulk `POST`: `[AssignmentOperation(None, a) for a in created_assignments]`
  - Bulk `PUT`: `[AssignmentOperation(original_map[a.id], a) for a in updated_assignments]`
  - Bulk `DELETE`: `[AssignmentOperation(original, None) for original in pre_fetched_assignments]`

**Step 8** — `backend/api_gateway/src/services/schedule_service.py`
- In `validate_schedule()`: the call `await self.notification_service.notify_schedule_published(schedule)` remains; the internal implementation now uses the new type. No route-level change needed.

---

## Phase 3 — Email Templates (parallel with Phase 2)

**Step 9** — `infra/modules/s3_email_templates/templates/{en,es,fr}/`
- Remove (or rename): `notification_schedule_published_email.html`, `notification_assignment_changed_email.html`
- Add 4 new template files per language (12 files total):
  - `notification_user_published_schedule_email.html` — variables: `{recipient_name}`, `{schedule_name}`, `{team_name}`, `{notification_link}`, `{subject}`
  - `notification_user_created_assignment_email.html` — variables: `{recipient_name}`, `{shift_name}`, `{date}`, `{team_name}`, `{notification_link}`, `{subject}`
  - `notification_user_updated_assignment_email.html` — same variables
  - `notification_user_deleted_assignment_email.html` — same variables

---

## Phase 4 — Frontend Types & i18n (parallel with Phase 2 once schema is known)

**Step 10** — `frontend/src/types/notification.ts`
- `NotificationTypeT`: remove `"schedule_published"` and `"assignment_changed"`; add `"user_published_schedule"`, `"user_created_assignment"`, `"user_updated_assignment"`, `"user_deleted_assignment"`
- `NotificationKey`: rename `"schedule_published"` → `"user_published_schedule"`; keep `"assignment_changes"`
- `NOTIFICATION_KEYS` array: update accordingly
- `NOTIFICATION_REGISTRY`: update entry for renamed key

**Step 11** — `frontend/src/app/i18n/locales/en/notifications.json` (and es/fr)
- Remove keys: `"schedule_published"`, `"assignment_changed"`, `"email_schedule_published"` (old label key)
- Add keys:
  - `"user_published_schedule"`: `"Schedule {{scheduleName}} has been published for team {{teamName}}"`
  - `"user_created_assignment"`: `"A new assignment for {{shiftName}} on {{date}} has been added to your schedule"`
  - `"user_updated_assignment"`: `"Your assignment for {{shiftName}} on {{date}} was updated"`
  - `"user_deleted_assignment"`: `"Your assignment for {{shiftName}} on {{date}} was removed from your schedule"`
  - `"email_user_published_schedule"`: `"Schedule published"` (settings label)

**Step 12** — `frontend/src/components/notifications/notification-item.tsx`
- Update `getMessageKey()` switch: remove `schedule_published` and `assignment_changed` cases; add cases for 4 new types returning corresponding message keys

**Step 13** — `frontend/src/app/lib/utils/getNotificationTargetPath.ts`
- Remove cases: `schedule_published`, `assignment_changed`
- Add cases:
  - `user_published_schedule`: return `${base}/schedule?scheduleId=${notification.eventData.scheduleId ?? ""}`
  - `user_created_assignment`, `user_updated_assignment`, `user_deleted_assignment`: return `${base}/schedule`

---

## Phase 5 — E2E Tests (depends on Phases 2 + 4)

**Step 14** — New file: `frontend/tests/e2e/schedule/schedule-notifications.spec.ts`
Mirrors the structure of `team-notifications.spec.ts`. Tests notification **creation only** (DB assertion, no UI rendering check).

Setup per test (`beforeEach`): reset DB, create 2 users, team (user1=owner), link user2 as member + attach worker2 to user2, create standard shifts.

Tests:
- `"user2 receives user_published_schedule notification when schedule is validated"`:
  - create schedule, validate it
  - assert: notification with `type === "user_published_schedule"`, `eventData.teamName`, `eventData.scheduleId`
- `"user2 receives user_created_assignment notification when assignment is created in published schedule"`:
  - create + validate schedule, create assignment for worker2 with `scheduleId`
  - assert: `type === "user_created_assignment"`, `eventData.shiftName`, `eventData.date`
- `"user2 receives user_deleted_assignment notification when assignment is deleted in published schedule"`:
  - create + validate schedule, create assignment, delete it
  - assert: `type === "user_deleted_assignment"`
- `"user2 receives user_updated_assignment notification when assignment shift is changed in published schedule"`:
  - create + validate schedule, create assignment, update it changing `shiftId`
  - assert: `type === "user_updated_assignment"`
- `"user2 receives user_updated_assignment notification when assignment date is changed in published schedule"`:
  - create + validate schedule, create assignment, update it changing `date`
  - assert: `type === "user_updated_assignment"`
- `"old user receives user_deleted_assignment and new user receives user_created_assignment when worker is changed"`:
  - create worker2 (linked to user2) and worker3 (linked to user3), create + validate schedule
  - create assignment for worker2, update it changing `workerId` to worker3
  - assert: user2 gets `user_deleted_assignment`, user3 gets `user_created_assignment`
- `"no notification when only the fixed flag is changed on a published schedule assignment"`:
  - create + validate schedule, create assignment, update with only `fixed` toggled
  - assert: no `user_updated_assignment` notification created
- `"no notification when assignment date falls within an unpublished (non-validated) schedule"`:
  - create a schedule (do NOT validate it), create/update/delete assignment whose date falls within that schedule's date range
  - assert: zero notifications created
- `"notification fires when assignment date falls outside any schedule date range"`:
  - create + validate a schedule for month M, then create/update/delete assignment on a date in month M+2 (outside all schedule ranges)
  - assert: notification IS created (outside any campaign = treated as always-published)
- `"bulk assignment create on published schedule — one notification per user"`:
  - validate schedule, bulk create 3 assignments all for worker2
  - assert: exactly 1 `user_created_assignment` notification for user2 (not 3)
- `"bulk assignment update on published schedule — one notification per user"`:
  - validate schedule, create 3 assignments for worker2, bulk update all 3 (change shift)
  - assert: exactly 1 `user_updated_assignment` notification for user2
- `"bulk assignment delete on published schedule — one notification per user"`:
  - validate schedule, create 3 assignments for worker2, bulk delete all 3
  - assert: exactly 1 `user_deleted_assignment` notification for user2

**Step 15** — Modify `frontend/tests/e2e/notifications/notification-content.spec.ts`
- Remove test cases: `schedule_published`, `assignment_changed` (these no longer exist as types)
- Add 4 new test cases to `NOTIFICATION_TEST_CASES`:
  ```
  {
    type: "user_published_schedule",
    preferenceKey: "user_published_schedule",
    recipientRole: "user2",
    setup: link user2 as worker, create schedule, validateSchedule → return user2.user_id,
    expectedText: (name) => `Schedule ... has been published for team ${name}` (regex to match dynamic schedule_name),
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_created_assignment",
    preferenceKey: "assignment_changes",
    recipientRole: "user2",
    setup: link user2 as worker, create+validate schedule, create assignment with scheduleId,
    expectedText: (_name) => new RegExp(`A new assignment for .* on ${someDate} has been added`),
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_updated_assignment",
    preferenceKey: "assignment_changes",
    recipientRole: "user2",
    setup: create+validate, create assignment, update it,
    expectedText: (_name) => new RegExp(`Your assignment for .* on .* was updated`),
    expectedUrlPattern: /\/plan\/schedule/,
  },
  {
    type: "user_deleted_assignment",
    preferenceKey: "assignment_changes",
    recipientRole: "user2",
    setup: create+validate, create assignment, delete it,
    expectedText: (_name) => new RegExp(`Your assignment for .* on .* was removed from your schedule`),
    expectedUrlPattern: /\/plan\/schedule/,
  },
  ```

---

## Relevant Files

- `backend/shared/src/shared/schemas/core/notification.py` — NotificationType enum
- `backend/shared/src/shared/schemas/core/notification_preferences.py` — NotificationKey, NOTIFICATION_REGISTRY
- `backend/shared/src/shared/schemas/core/email.py` — EmailType enum
- `backend/api_gateway/src/services/notification_builders.py` — pure factory functions
- `backend/api_gateway/src/services/notification_email_config.py` — NOTIFICATION_EMAIL_MAP, NOTIFICATION_SUBJECTS
- `backend/api_gateway/src/services/notification_service.py` — dispatch, _NOTIFICATION_TYPE_TO_KEY, notify_* methods
- `backend/api_gateway/src/routes/assignment_routes.py` — notify calls for all CRUD routes
- `backend/api_gateway/src/services/schedule_service.py` — validate_schedule → notify_schedule_published
- `infra/modules/s3_email_templates/templates/{en,es,fr}/` — add 4 new templates, remove 2 old
- `frontend/src/types/notification.ts` — NotificationTypeT, NotificationKey, NOTIFICATION_REGISTRY
- `frontend/src/app/i18n/locales/en/notifications.json` (+ es/fr) — message keys
- `frontend/src/components/notifications/notification-item.tsx` — getMessageKey()
- `frontend/src/app/lib/utils/getNotificationTargetPath.ts` — path switch
- `frontend/tests/e2e/schedule/schedule-notifications.spec.ts` — NEW file
- `frontend/tests/e2e/notifications/notification-content.spec.ts` — add 4 cases, remove 2

---

## Verification

1. Run `pytest -q` in `backend/api_gateway` and `backend/shared` — both pass with no import/type errors
2. Run `npx tsc --noEmit` in `frontend/` — zero TypeScript errors
3. Run new E2E test file: `npx playwright test tests/e2e/schedule/schedule-notifications.spec.ts --project=chromium`
4. Run updated notification-content tests: `npx playwright test tests/e2e/notifications/notification-content.spec.ts --project=chromium`
5. Validate that the notification settings tab UI still renders correctly (no missing i18n keys) by running `npx playwright test tests/e2e/settings --project=chromium`
6. Manually verify: publish a schedule and check a member worker gets a `user_published_schedule` notification displayed correctly in the bell and notifications page

---

## Decisions & Scope

- **Preference key for schedule**: renamed from `schedule_published` to `user_published_schedule` to match new type naming. **Note**: existing user preferences in MongoDB will lose the old key on next access (they will be recreated as defaults). A DB migration script (`database_migration/migrations/`) to rename the key in documents should be added if production data preservation is needed — noted as **out of scope** for this plan but flagged.
- **Preference key for assignments**: `assignment_changes` retained as a single group key for all 3 operation types (create/update/delete). No per-operation granularity.
- **Published period check**: query schedules by date range (`start_date ≤ assignment.date ≤ end_date`) for the team. If a matching schedule exists and `status != VALIDATED` → suppress notification (unpublished campaign). If no matching schedule exists → notify (outside any campaign = always notify). `assignment.schedule_id` is NOT used as the check criterion.
- **Update smart-diffing**: notifications for updates are only sent when worker/shift/date actually changes. Field-only changes (e.g. `fixed`) produce no notification.
- **Worker reassignment**: an update that changes `worker_id` counts as a delete for the original worker's user AND a create for the new worker's user.
- **Bulk de-duplication**: multiple assignments affecting the same user in a single bulk operation result in **one** notification per user (not one per assignment).
- **Pre-fetch pattern for delete/update**: routes must fetch the original assignment(s) before the service mutation executes so that `before` state is available for `AssignmentOperation`.
- **Email templates**: old templates removed, 4 new ones added (en/es/fr = 12 files). Email feature is gated by `config.environment == "production"` so won't fire in dev/test.
- **Out of scope**: data migration for old `schedule_published`/`assignment_changed` notification documents already in DB; not breaking/changing swap or request notifications.
