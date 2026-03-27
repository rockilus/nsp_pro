# Plan: Team Notification Email Delivery

**TL;DR** — Extend `NotificationService.dispatch()` — already the single gating point for all 9 notification types — to also send a notification email via `EmailQueueService` whenever the user's `email` preference is enabled. Use a table-driven config map so adding new notification types in the future requires only one dict entry and two new template files. Emails are only sent in production. Subjects live in a Python dict (3 languages × 9 types). `dispatch()` becomes `async` with all call sites updated.

---

## Phase 1 — Shared schema additions

Add 5 missing `EmailType` values to `backend/shared/src/shared/schemas/core/email.py`:
- `NOTIFICATION_SWAP_STATUS_CHANGED`
- `NOTIFICATION_USER_RECEIVED_TEAM_INVITE`
- `NOTIFICATION_USER_ACCEPTED_TEAM_INVITE`
- `NOTIFICATION_USER_REMOVED_FROM_TEAM`
- `NOTIFICATION_USER_LEFT_TEAM`

---

## Phase 2 — Notification email config module (NEW file)

Create `backend/api_gateway/src/services/notification_email_config.py` containing three things:

- **`NOTIFICATION_EMAIL_MAP`** — `dict[NotificationType, tuple[str, EmailType, str]]` mapping each type to `(template_name, EmailType, app_path_suffix)`. Adding a new type = one new row.
- **`NOTIFICATION_SUBJECTS`** — `dict[tuple[NotificationType, str], str]` mapping `(type, "en"|"es"|"fr")` → translated subject string. 27 entries total.
- **`build_email_context(type, event_data, user, link, subject) → dict`** — merges standard fields (`recipient_name` from `User.first_name`, `notification_link`, `subject`) with `event_data` passed through.

---

## Phase 3 — Generic enqueue method in EmailQueueService

Add `async enqueue_notification(to_address, template_name, email_type, context, language)` to `backend/api_gateway/src/services/email_queue_service.py`. Assembles an `EmailMessage` and calls `_enqueue_email()`. Existing per-type methods are untouched.

---

## Phase 4 — NotificationService wiring

**4.1.** Inject `email_queue_service: EmailQueueService | None = None` into `NotificationService.__init__()`.

**4.2.** Make `dispatch()` **`async`**. After creating the in-app notification (existing path), call `await self._try_send_email(...)`.

**4.3.** Add `async _try_send_email(user_id, pref_key, event)`:
- Guard 1: `config.environment != "production"` → return
- Guard 2: `NOTIFICATION_EMAIL_MAP` has no entry for the type → return
- Guard 3: re-use already-fetched `prefs` — check `channel.email`; if False → return
- Fetch user: `self.collection.user_db.get_user_by_id(user_id)` → `User.email` + `User.language`
- Build link: `config.client_url + f"/{user.language.value}" + app_path_suffix`
- Get subject from `NOTIFICATION_SUBJECTS`
- Build context via `build_email_context(...)`
- `await self.email_queue_service.enqueue_notification(...)`
- Fully wrapped in try/except — fire-and-forget, never raises

**4.4.** Make `notify_schedule_published()`, `notify_new_swap_request()`, `notify_request_status_changed()`, `notify_assignment_changed()` all **`async`** since they call `dispatch()`.

---

## Phase 5 — Call-site updates (async cascade, ~8 sites)

Add `await` to all `dispatch()` / `notify_*` call sites:

| File | Change |
|---|---|
| `backend/api_gateway/src/services/schedule_service.py` | `await notify_schedule_published` |
| `backend/api_gateway/src/services/swap_service.py` | `await notify_new_swap_request` |
| `backend/api_gateway/src/services/request_service.py` | `await notify_request_status_changed` |
| `backend/api_gateway/src/routes/assignment_routes.py` | `await notify_assignment_changed` |
| `backend/api_gateway/src/services/team_service.py` | `await dispatch(...)` |
| `backend/api_gateway/src/services/team_invitation_service.py` | `await dispatch(...)` × 2 |

---

## Phase 6 — Factory / DI

Update every place `NotificationService` is instantiated in `api_gateway` to pass `email_queue_service` (via the existing `create_email_queue_service(collection)` factory).

---

## Phase 7 — HTML email templates (27 files)

Create 9 templates × 3 languages under `infra/modules/s3_email_templates/templates/{en,es,fr}/`:

| Template name | Type-specific variables (beyond standard) |
|---|---|
| `notification_schedule_published_email` | `schedule_name`, `team_name` |
| `notification_new_swap_request_email` | `requester_name`, `date`, `team_name` |
| `notification_swap_status_changed_email` | `team_name`, `date` |
| `notification_request_status_changed_email` | `new_status`, `shift_name`, `date`, `team_name` |
| `notification_assignment_changed_email` | `shift_name`, `date` |
| `notification_user_received_team_invite_email` | `team_name`, `sender_name` |
| `notification_user_accepted_team_invite_email` | `team_name`, `accepted_user_name` |
| `notification_user_removed_from_team_email` | `team_name` |
| `notification_user_left_team_email` | `team_name`, `user_name` |

All templates reuse `../styles/email_common.css` and `{variable}` substitution. Standard vars on every template: `{recipient_name}`, `{notification_link}`, `{subject}`.

---

## Phase 8 — Transactional email duplicate audit

Four notification types already send a standalone transactional email today:
- `SCHEDULE_PUBLISHED` → `enqueue_schedule_published()` in `schedule_service`
- `USER_RECEIVED_TEAM_INVITE` → `enqueue_team_invitation()` in `team_invitation_service`
- `NEW_SWAP_REQUEST` / `SWAP_STATUS_CHANGED` → swap enqueue methods

**Recommendation:** Remove those transactional calls and let `dispatch()` own all email delivery (respects user preference, no double-send). Notification email templates provide equivalent content. This step can be done last after templates are validated.

---

## Verification

1. `cd backend/api_gateway && pytest` — confirm no regressions from the async cascade
2. Unit test `_try_send_email()`: assert emails sent in `"production"` env, skipped otherwise
3. Unit test preference gating: `channel.email = False` → `enqueue_notification` not called
4. Smoke test: dispatch a `SCHEDULE_PUBLISHED` event, assert correct template name + context keys
5. Template render test: call `render_template(html, context)` for all 27 templates to catch missing `{variable}` references

---

## Decisions

- Subjects as Python dict — simple, update on deploy
- `dispatch()` → `async`, 8 call sites updated mechanically
- All 9 types covered immediately
- Production guard: `config.environment != "production"` → skip email
- 4 transactional email calls removed in Phase 8 to avoid double-send

## Further Considerations

1. **`changed_by` in `ASSIGNMENT_CHANGED`** — `event_data` stores a raw `user_id`, not a display name. The `_try_send_email()` method should resolve this to a user name via `get_user_by_id()` for this specific type before the template is finalized. Recommend resolving it at dispatch time.
2. **Template upload to S3** — the 27 new HTML files need to be uploaded to the S3 templates bucket. If there's an existing CI/CD step that syncs `infra/modules/s3_email_templates/templates/` to the bucket, it will pick these up automatically — worth confirming before calling Phase 7 complete.
