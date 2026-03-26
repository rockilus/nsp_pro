# Plan: Notification Content E2E Tests (Data-Driven)

## TL;DR
Add per-type text + navigation E2E tests for all 4 team notification types using a data-driven loop over a typed `NOTIFICATION_TEST_CASES` array. Shared helpers provide isolation boilerplate (`NotificationTestContextMap`) and a `setup` method per case handles its own data creation. Two blocking bugs must be fixed first, or text assertions will fail. Future notification categories (schedule, swaps, etc.) are added by appending one object to the array.

---

## Prerequisite Bugs Discovered

### Bug 1 — `getMessageKey` uses wrong i18n keys for team notifications
File: `frontend/src/components/notifications/notification-item.tsx`

| Current (wrong) | Correct i18n key |
|---|---|
| `"user_received_team_invite"` | `"team_invite_received"` |
| `"user_accepted_team_invite"` | `"team_invite_accepted"` |
| `"user_removed_from_team"` | `"member_removed"` |
| `"user_left_team"` | `"member_left"` |

### Bug 2 — `user_left_team` eventData key mismatch
- Backend `notification_builders.py` outputs `event_data = { user_name, team_name }`
- Translation template `member_left` uses `{{member_name}}` → renders as literal placeholder
- Fix: change `{{member_name}}` → `{{user_name}}` in all 3 locale files (en, es, fr)

---

## Steps

### Phase 1 — Bug Fixes (prerequisite)
1. Fix `getMessageKey` in `notification-item.tsx` — map 4 team types to correct i18n keys
2. Update `{{member_name}}` → `{{user_name}}` in `member_left` template in en, es, fr locale files

### Phase 2 — Shared Helpers (*parallel with Phase 1*)
3. Create `frontend/tests/e2e/notifications/helpers/notification-test-helpers.ts` exporting:

   **`NotifTestContext` interface**
   ```ts
   interface NotifTestContext {
     dbUtils: DatabaseTestUtils;
     team: { teamId: string; name: string };
   }
   ```

   **`NotificationTestContextMap<T>` class** — prevents data leakage between parallel workers:
   - `initRunId(testInfo): string` — generates `workerIndex-title-uuid`, stores on testInfo, returns it
   - `getRunId(testInfo): string` — reads key from testInfo
   - `set(runId, ctx): void`
   - `get(runId): T` — non-null assertion
   - `delete(runId): void`

   **`navigateToNotificationsAsUser(page, dbUtils, userId)`** — extracted from existing spec.

   **`NotificationTestCase` interface** — the data-driven contract:
   ```ts
   interface NotificationTestCase {
     type: NotificationTypeT;
     description: string;
     /** Creates all required test data; returns the userId who should receive the notification */
     setup: (dbUtils: DatabaseTestUtils, team: { teamId: string; name: string }) => Promise<string>;
     expectedText: (teamName: string) => string;
     expectedUrlPattern: RegExp;
   }
   ```
   `setup` receives the pre-isolated `dbUtils` and `team` from `beforeEach`, creates the specific trigger data, and returns the recipient's `userId`.

### Phase 3 — Data-Driven Content Tests (*depends on Phase 1 + 2*)
4. Create `frontend/tests/e2e/notifications/notification-content.spec.ts`

   **`NOTIFICATION_TEST_CASES: NotificationTestCase[]`** — 4 team entries (extensible):

   | type | setup actions | recipient | expectedText(name) | expectedUrlPattern |
   |---|---|---|---|---|
   | `user_received_team_invite` | `createTeamInvitationAs(TEST_USER, teamId, TEST_USER_2.email)` | TEST_USER_2 | `"Test User invited you to join ${name}"` | `/\/plan\/settings\/teams/` |
   | `user_accepted_team_invite` | invite + `acceptTeamInvitationAs(TEST_USER_2, token)` | TEST_USER | `"Test User2 accepted your invitation to ${name}"` | `/\/plan\/settings\/teams/` |
   | `user_removed_from_team` | `addTeamMember(TEST_USER_2, …)` + `removeTeamMemberAs(TEST_USER, …, TEST_USER_2)` | TEST_USER_2 | `"You have been removed from team ${name}"` | `/\/plan\/settings\/teams/` |
   | `user_left_team` | `addTeamMember(TEST_USER_2, …)` + `leaveTeamAs(TEST_USER_2, …)` | TEST_USER | `"Test User2 left your team ${name}"` | `/\/plan\/settings\/teams/` |

   **Structure:**
   ```ts
   const ctxMap = new NotificationTestContextMap<NotifTestContext>();

   test.beforeEach(async ({}, testInfo) => {
     const runId = ctxMap.initRunId(testInfo);
     const dbUtils = new DatabaseTestUtils();
     await dbUtils.resetDatabase({ collections: ["teams","team_memberships","team_invitations","notifications"] });
     const team = await dbUtils.createTeam({ name: `Content Test ${Date.now()}` });
     ctxMap.set(runId, { dbUtils, team });
   });

   test.afterEach(async ({}, testInfo) => {
     ctxMap.delete(ctxMap.getRunId(testInfo));
   });

   for (const tc of NOTIFICATION_TEST_CASES) {
     test.describe(tc.type, () => {
       test("shows correct notification message", async ({ page }, testInfo) => {
         const { dbUtils, team } = ctxMap.get(ctxMap.getRunId(testInfo));
         const recipientId = await tc.setup(dbUtils, team);
         await navigateToNotificationsAsUser(page, dbUtils, recipientId);
         const msg = page.locator(`[data-notification-type="${tc.type}"]`)
           .locator('[data-testid="notification-message"]');
         await expect(msg).toHaveText(tc.expectedText(team.name));
       });

       test("clicking navigates to correct page", async ({ page }, testInfo) => {
         const { dbUtils, team } = ctxMap.get(ctxMap.getRunId(testInfo));
         const recipientId = await tc.setup(dbUtils, team);
         await navigateToNotificationsAsUser(page, dbUtils, recipientId);
         await page.locator(`[data-notification-type="${tc.type}"] a`).first().click();
         await page.waitForURL(tc.expectedUrlPattern, { timeout: 10_000 });
       });
     });
   }
   ```

### Phase 4 — Refactor Existing Spec (*parallel with Phase 3*)
5. Update `notifications-page.spec.ts` to:
   - Import `navigateToNotificationsAsUser`, `NotifTestContext`, `NotificationTestContextMap` from shared helpers
   - Replace local `testContextMap + testRunId` boilerplate with `NotificationTestContextMap`

---

## Relevant Files
- `frontend/src/components/notifications/notification-item.tsx` — Phase 1: fix getMessageKey
- `frontend/src/app/i18n/locales/en/notifications.json` — Phase 1: fix member_left template
- `frontend/src/app/i18n/locales/es/notifications.json` — Phase 1: fix member_left template
- `frontend/src/app/i18n/locales/fr/notifications.json` — Phase 1: fix member_left template
- `frontend/tests/e2e/notifications/notifications-page.spec.ts` — Phase 4 refactor
- NEW `frontend/tests/e2e/notifications/helpers/notification-test-helpers.ts` — Phase 2
- NEW `frontend/tests/e2e/notifications/notification-content.spec.ts` — Phase 3

## Verification
1. `cd frontend && npx playwright test tests/e2e/notifications/ --project=chromium` — 8 new tests + 5 existing all pass
2. Confirm each text assertion renders the full interpolated string, not a key literal
3. Confirm `data-notification-type` matches the expected type per item

## Decisions
- **Data-driven**: one object per type in `NOTIFICATION_TEST_CASES`; new types = one appended object
- **`setup` per case**: each case owns its own trigger data creation; `beforeEach` only provides base isolation (reset + empty team)
- **`NotificationTestContextMap`**: reusable class that eliminates boilerplate and prevents parallel worker data contamination
- **Bug fixes in-scope**: Phase 1 is prerequisite; without it text assertions return key literals
- **`{{member_name}}` fix on frontend**: simpler than a backend change; aligns template with existing eventData key
- **`addTeamMember` for remove/leave**: bypasses invitation flow, creates exactly 1 notification per test
- **Scope**: team notifications only for now; `NOTIFICATION_TEST_CASES` in same file for discoverability, helpers file stays generic
