# Plan: Campaign Request Deadline Feature

## TL;DR
Team leaders can set a deadline on a CAMPAIGN schedule asking members to submit their availability requests, send reminders, and extend the deadline. `request_deadline` is added as an **optional, backward-compatible** field on `Schedule` (no migration needed — old documents simply lack the field and `from_dict` returns `None`). Since members cannot read schedule objects, a new slim read endpoint exposes only the deadline to members. 3 new notification types cover set/remind/extend flows. Full E2E + email coverage included. **No tests are run at the end.**

---

## Phase 1 — Shared Schema Changes (`backend/shared`)

*All steps in this phase are independent and can be done in one pass.*

**1.1 — `Schedule` dataclass** (`backend/shared/src/shared/schemas/core/schedule.py`)
- Add `request_deadline: Optional[date] = None` field to `Schedule` dataclass (optional, backward-compatible — old documents without the field deserialize to `None`)
- Update `to_dict()`: serialize `request_deadline` as Unix timestamp float or `None`
- Update `from_dict()`: deserialize back to `date` using `.get("request_deadline")` — returns `None` if absent
- Update `to_dto()`: map to `requestDeadline`
- Update `from_dto()`: map from `requestDeadline`

**1.2 — `ScheduleDTO`** (`backend/shared/src/shared/schemas/dto/schedule.py`)
- Add `requestDeadline: Optional[float] = None`

**1.3 — New `NotificationType` values** (`backend/shared/src/shared/schemas/core/notification.py`)
- Add to `NotificationType` enum:
  - `CAMPAIGN_REQUEST_DEADLINE_SET = "campaign_request_deadline_set"`
  - `CAMPAIGN_REQUEST_DEADLINE_REMINDER = "campaign_request_deadline_reminder"`
  - `CAMPAIGN_REQUEST_DEADLINE_EXTENDED = "campaign_request_deadline_extended"`

**1.4 — New `NotificationKey` values** (`backend/shared/src/shared/schemas/core/notification_preferences.py`)
- Add to `NotificationKey` enum: `CAMPAIGN_REQUEST_DEADLINE_SET`, `CAMPAIGN_REQUEST_DEADLINE_REMINDER`, `CAMPAIGN_REQUEST_DEADLINE_EXTENDED`
- Add to `NOTIFICATION_REGISTRY` (all with `category=NotificationCategory.SCHEDULE`, `visible_to=frozenset({"member"})`):
  ```python
  NotificationKey.CAMPAIGN_REQUEST_DEADLINE_SET: NotificationKeyMeta(
      category=NotificationCategory.SCHEDULE,
      visible_to=frozenset({"member"}),
  )
  ```
  (same pattern for REMINDER and EXTENDED)

**1.5 — New `EmailType` values** (`backend/shared/src/shared/schemas/core/email.py`)
- Add 3 values:
  - `NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_SET`
  - `NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_REMINDER`
  - `NOTIFICATION_CAMPAIGN_REQUEST_DEADLINE_EXTENDED`

---

## Phase 2 — API Gateway

*Steps 2.1–2.3 are independent; 2.4–2.5 depend on 2.1–2.3; 2.6 depends on 2.4–2.5.*

**2.1 — Notification builders** (`backend/api_gateway/src/services/notification_builders.py`)
- Add 3 pure builder functions returning `NotificationEvent`:
  - `campaign_request_deadline_set_event(team_id, team_name, deadline_date, schedule_start, schedule_end, member_user_ids)`
  - `campaign_request_deadline_reminder_event(team_id, team_name, deadline_date, schedule_start, schedule_end, member_user_ids)`
  - `campaign_request_deadline_extended_event(team_id, team_name, old_deadline_date, new_deadline_date, schedule_start, schedule_end, member_user_ids)`
- `event_data` keys: `team_name`, `deadline_date`, `schedule_start_date`, `schedule_end_date` (and `old_deadline_date`/`new_deadline_date` for extended)

**2.2 — `_NOTIFICATION_TYPE_TO_KEY` + `notify_*` methods** (`backend/api_gateway/src/services/notification_service.py`)
- Add 3 entries to `_NOTIFICATION_TYPE_TO_KEY` dict mapping new `NotificationType` → `NotificationKey`
- Add 3 `async notify_campaign_request_deadline_*()` methods following the existing try/except + dispatch pattern; each fetches team name, gets member user IDs from workers, builds event via builder, calls `await self.dispatch(event)`

**2.3 — Email config** (`backend/api_gateway/src/services/notification_email_config.py`)
- Add 3 entries to `NOTIFICATION_EMAIL_MAP`:
  - Template name matches filename without `.html` (e.g. `"notification_campaign_request_deadline_set_email"`)
  - Deep link path: `"/plan/requests"`
- Add subjects in `NOTIFICATION_SUBJECTS` for `"en"`, `"fr"`, `"es"`:
  - SET: "Your team leader has requested your availability"
  - REMINDER: "Reminder: Submit your availability requests"
  - EXTENDED: "Your request submission deadline has been extended"

**2.4 — `ScheduleService` methods** (`backend/api_gateway/src/services/schedule_service.py`)
- Add `set_request_deadline(schedule_id, deadline_date)`:
  - Fetch schedule, validate it is CAMPAIGN status, validate `deadline_date > today`
  - Set `schedule.request_deadline = deadline_date`, update `updated_at`, save
  - Fetch workers (`get_workers_not_deleted`), collect `member_user_ids`
  - Call `await self.notification_service.notify_campaign_request_deadline_set(...)`
  - Return updated `Schedule`
- Add `send_request_deadline_reminder(schedule_id)`:
  - Fetch schedule, validate `request_deadline` is set
  - Fetch workers, dispatch REMINDER notification
  - Return `{"message": "Reminder sent"}`
- Add `extend_request_deadline(schedule_id, new_deadline_date)`:
  - Fetch schedule, validate `request_deadline` is set, validate `new_deadline_date > current request_deadline`
  - Store `old_deadline`, update field, save
  - Dispatch EXTENDED notification
  - Return updated `Schedule`

**2.5 — Request deadline read model** (`backend/api_gateway/src/routes/schedule_routes.py`)
- New Pydantic response model: `class RequestDeadlineDTO(BaseModel): deadlineDate: Optional[float]`
- New read endpoint accessible to members:
  `GET /schedules/teams/{team_id}/request-deadline`
  - authz action: `"read-requests"` (same permission members already hold)
  - Fetches the CAMPAIGN schedule for the team (if any)
  - Returns `RequestDeadlineDTO(deadlineDate=schedule.request_deadline as timestamp or None)`
  - Members never receive a `ScheduleDTO`, only this slim response

**2.6 — Write endpoints** (`backend/api_gateway/src/routes/schedule_routes.py`)
- Inline body model: `class SetDeadlineBody(BaseModel): deadline: float`
- `POST /schedules/{schedule_id}/request-deadline/teams/{team_id}` → `set_request_deadline`, authz `"update-schedule"`
- `POST /schedules/{schedule_id}/request-deadline/reminder/teams/{team_id}` → `send_request_deadline_reminder`, authz `"update-schedule"`
- `PUT /schedules/{schedule_id}/request-deadline/teams/{team_id}` → `extend_request_deadline`, authz `"update-schedule"`

---

## Phase 3 — Email Templates (3 new HTML files, independent)

7. `infra/modules/s3_email_templates/templates/en/notification_campaign_request_deadline_set_email.html`
   - Template vars: `{recipient_name}`, `{team_name}`, `{deadline_date}`, `{schedule_start_date}`, `{schedule_end_date}`, `{notification_link}`
8. `notification_campaign_request_deadline_reminder_email.html` — same vars
9. `notification_campaign_request_deadline_extended_email.html` — vars: `{recipient_name}`, `{team_name}`, `{old_deadline_date}`, `{new_deadline_date}`, `{schedule_start_date}`, `{schedule_end_date}`, `{notification_link}`
- Copy the HTML structure from the existing `notification_user_left_team_email.html` (same CSS link, `.email-container` / `.email-header` / `.email-body` / `.email-footer` / `.cta-button` pattern)

---

## Phase 4 — Frontend

*Steps 10–12 are independent; 13–16 depend on them.*

**4.1 — `ScheduleT` type** (`frontend/src/types/schedule.ts`)
- Add `requestDeadline?: dayjs.Dayjs` to `ScheduleT`
- Update `toScheduleT` deserializer: map `requestDeadline` via `dayjs.unix(data.requestDeadline).utc()` when present, else `undefined`

**4.2 — New `RequestDeadlineT` type** (`frontend/src/types/schedule.ts` or new file)
- `type RequestDeadlineT = { deadlineDate: dayjs.Dayjs | null }`

**4.3 — API functions** (`frontend/src/app/lib/api/scheduleApi.ts`)
- `getRequestDeadline(apiClient, teamId): Promise<RequestDeadlineT>` — calls `GET /schedules/teams/{teamId}/request-deadline`
- `setRequestDeadline(apiClient, scheduleId, teamId, deadline: Date): Promise<ScheduleT>` — POST
- `sendRequestDeadlineReminder(apiClient, scheduleId, teamId): Promise<void>` — POST
- `extendRequestDeadline(apiClient, scheduleId, teamId, newDeadline: Date): Promise<ScheduleT>` — PUT

**4.4 — Hooks** (`frontend/src/hooks/useSchedule.ts`)
- `useGetRequestDeadline(teamId)` — React Query hook (same pattern as other data hooks), enables on `teamId` present
- `useSetRequestDeadline()`, `useSendRequestDeadlineReminder()`, `useExtendRequestDeadline()` — `useCallback` mutation hooks

**4.5 — Campaign tab: `<RequestDeadlinePanel>` component** (new file: `frontend/src/components/campaign/request-deadline-panel.tsx`)
- Props: `scheduleCampaign: ScheduleT`, `onDeadlineSet: (s: ScheduleT) => void`, `onDeadlineExtended: (s: ScheduleT) => void`, `onReminderSent: () => void`, `lng: string`
- When `requestDeadline` is unset: "Set deadline & notify" button → MUI `Dialog` with date picker → calls `useSetRequestDeadline`, calls `onDeadlineSet`
- When `requestDeadline` is set:
  - Shows formatted deadline date
  - "Send reminder" button → calls `useSendRequestDeadlineReminder`, calls `onReminderSent`
  - "Extend deadline" button → MUI `Dialog` with date picker (min date = current deadline + 1 day) → calls `useExtendRequestDeadline`, calls `onDeadlineExtended`
- Uses MUI components (consistent with rest of campaign tab)

**4.6 — Campaign tab integration** (`frontend/src/components/campaign/campaign-tab.tsx`)
- Add state handlers `handleDeadlineSet`, `handleDeadlineExtended`, `handleReminderSent`
- Render `<RequestDeadlinePanel>` after `<ScheduleSelector>` inside the `scheduleCampaign` branch (not gated by `useSolver` — deadline applies to all teams)

**4.7 — Request tab deadline banner** (`frontend/src/components/request/request-tab.tsx`)
- Call `useGetRequestDeadline(teamId)` — returns `RequestDeadlineT`
- Show MUI `Alert severity="info"` above tab content when `deadlineDate` is set and in the future
- Banner text (i18n key `"request_deadline_banner"`): "Your team leader has requested that you submit your availability by {date}"
- Same addition in `frontend/src/components/request/mobile/mobile-request-tab.tsx`

**4.8 — `createdAt` column in request table** (`frontend/src/components/request/request-table.tsx`)
- Add new prop `requestDeadline?: dayjs.Dayjs` to the component
- Add a `createdAt` column — visible only when `userTeamRole` is owner or manager
- Cell renders the formatted date + a green chip ("Before deadline") or red chip ("After deadline") based on comparison with `requestDeadline` prop (chip only shown when `requestDeadline` is set)
- Update `RequestTab` to pass `deadlineDate` from `useGetRequestDeadline` result into `RequestTable`

**4.9 — i18n translation keys** (find all `request-page.json` and `campaign-page.json` translation files across all locale folders)
- `request-page.json`: add `"request_deadline_banner"`, `"submitted_on"`, `"before_deadline"`, `"after_deadline"`
- `campaign-page.json`: add `"set_deadline"`, `"send_reminder"`, `"extend_deadline"`, `"current_deadline"`, `"no_deadline_set"`, `"deadline_dialog_title"`, `"extend_deadline_dialog_title"`

---

## Phase 5 — E2E Tests

**General rules for all E2E tests in this phase:**
- Use `data-testid` attributes to locate all meaningful UI elements. Do not rely on text content, CSS classes, or MUI class names as selectors.
- When the test is NOT asserting the data-creation flow itself, use `dbUtils.makeAuthenticatedRequest(...)` to seed state via the API — keeps tests fast and focused on what matters.

**5.1 — Notification content spec** (`frontend/tests/e2e/notifications/notification-content.spec.ts`)
- Add 3 new `NotificationTestCase` objects to `NOTIFICATION_TEST_CASES`:
  - **SET**: `setup` adds user2 as member + worker and calls `POST .../request-deadline/...` via `makeAuthenticatedRequest` as user1. Returns `user2.user_id`. `expectedText` matches deadline date string. `expectedUrlPattern: /\/plan\/requests/`
  - **REMINDER**: same setup but also calls the reminder endpoint after SET (all via API)
  - **EXTENDED**: same setup, SET first, then calls PUT extend endpoint with a later date (all via API)
- All assertions use existing selectors: `[data-notification-type="{type}"]` and `[data-testid="notification-message"]`
- Preference-gate tests are covered automatically by the existing data-driven loop

**5.2 — Feature flow E2E spec** (new file: `frontend/tests/e2e/campaign/request-deadline.spec.ts`)
- `beforeEach`: seed team, owner (user1), member (user2), worker for user2, and campaign schedule via `DatabaseTestUtils` API helpers — not through UI
- New `data-testid` attributes required on new components (implementer must add these alongside the component code):
  - `data-testid="request-deadline-panel"` on the root element of `<RequestDeadlinePanel>`
  - `data-testid="set-deadline-button"`, `data-testid="send-reminder-button"`, `data-testid="extend-deadline-button"`
  - `data-testid="deadline-dialog"`, `data-testid="extend-deadline-dialog"` on the MUI dialogs
  - `data-testid="request-deadline-banner"` on the `Alert` in both request tab and mobile tab
  - `data-testid="request-created-at-chip"` on the before/after deadline chip in the request table
- Test 1: Owner sets deadline **via UI** (this IS the flow under test) → `[data-testid="request-deadline-panel"]` shows deadline date + reminder/extend buttons
- Test 2: Deadline seeded via API; member navigates to request tab → `[data-testid="request-deadline-banner"]` is visible with correct date
- Test 3: No deadline set → `[data-testid="request-deadline-banner"]` is absent
- Test 4: Deadline seeded via API; owner clicks `[data-testid="send-reminder-button"]` **via UI** → success snackbar/toast visible
- Test 5: Deadline seeded via API; owner extends **via UI** → `[data-testid="request-deadline-panel"]` shows updated date
- Test 6: Set + extend done via API; member sees updated date in `[data-testid="request-deadline-banner"]`
- Test 7: Past deadline seeded via API → `[data-testid="request-deadline-banner"]` is absent for member

---

## Relevant Files

| File | Change |
|------|--------|
| `backend/shared/src/shared/schemas/core/schedule.py` | Add optional `request_deadline` + serialization (backward-compatible) |
| `backend/shared/src/shared/schemas/dto/schedule.py` | Add optional `requestDeadline` field |
| `backend/shared/src/shared/schemas/core/notification.py` | 3 new `NotificationType` values |
| `backend/shared/src/shared/schemas/core/notification_preferences.py` | 3 new `NotificationKey` + registry entries |
| `backend/shared/src/shared/schemas/core/email.py` | 3 new `EmailType` values |
| `backend/api_gateway/src/services/notification_builders.py` | 3 new builder functions |
| `backend/api_gateway/src/services/notification_service.py` | 3 `_NOTIFICATION_TYPE_TO_KEY` entries + 3 `notify_*` methods |
| `backend/api_gateway/src/services/schedule_service.py` | 3 new service methods |
| `backend/api_gateway/src/services/notification_email_config.py` | 3 email map entries + subjects |
| `backend/api_gateway/src/routes/schedule_routes.py` | 1 new GET endpoint (members) + 3 new write endpoints (owners) |
| `infra/modules/s3_email_templates/templates/en/notification_campaign_request_deadline_set_email.html` | New |
| `infra/modules/s3_email_templates/templates/en/notification_campaign_request_deadline_reminder_email.html` | New |
| `infra/modules/s3_email_templates/templates/en/notification_campaign_request_deadline_extended_email.html` | New |
| `frontend/src/types/schedule.ts` | Add `requestDeadline?` to `ScheduleT`, new `RequestDeadlineT` |
| `frontend/src/app/lib/api/scheduleApi.ts` | 4 new API functions |
| `frontend/src/hooks/useSchedule.ts` | 4 new hooks |
| `frontend/src/components/campaign/request-deadline-panel.tsx` | New component |
| `frontend/src/components/campaign/campaign-tab.tsx` | Render `<RequestDeadlinePanel>` |
| `frontend/src/components/request/request-tab.tsx` | Deadline banner |
| `frontend/src/components/request/mobile/mobile-request-tab.tsx` | Deadline banner |
| `frontend/src/components/request/request-table.tsx` | `createdAt` column + deadline chip |
| Translation files `request-page.json` + `campaign-page.json` | New i18n keys |
| `frontend/tests/e2e/notifications/notification-content.spec.ts` | 3 new test cases |
| `frontend/tests/e2e/campaign/request-deadline.spec.ts` | New feature E2E test |

---

## Verification

1. `cd backend && pytest` — no regressions after DTO changes
2. `make solve_service_check_no_test` — type safety after shared changes
3. `cd frontend && npx tsc` — no TypeScript errors

---

## Decisions & Scope

- **No migration**: `request_deadline: Optional[date] = None` is backward-compatible; old documents simply lack the field and `from_dict` uses `.get()` returning `None`
- **Member access**: members call `GET /schedules/teams/{team_id}/request-deadline` (returns only `{ deadlineDate }`, not a full `ScheduleDTO`); authz uses the `"read-requests"` action they already hold
- Set deadline is a **separate POST** from the regular schedule update so the notification fires atomically with the write
- Extend endpoint validates `new_deadline > current_deadline` — cannot shorten
- Reminder endpoint makes no data change — dispatches notification only
- `createdAt` is already in `RequestDTO` / `RequestT` — no backend changes needed; only UI column is new
- New notification types live in `SCHEDULE` preference category, `visible_to=frozenset({"member"})`
- **Out of scope**: tracking which workers have/haven't submitted; bulk "missing requests" report
