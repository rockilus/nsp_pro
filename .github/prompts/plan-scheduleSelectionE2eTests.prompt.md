# Plan: E2E Tests for Schedule Selection Feature

## TL;DR
Add data-testid attributes to the selection-related components, then implement three new E2E test files covering access control, cell/assignment selection interactions (both views), and the action toolbar.

---

## Phase 1 — Add data-testid attributes

### 1a. `ScheduleActionToolbar.tsx`
Add to these elements (no testids exist beyond root `schedule-action-toolbar`):
- `schedule-action-main-button` → primary action `<Button>` (left of arrow)
- `schedule-action-dropdown-toggle` → `<Button>` with `ArrowDropDownIcon`
- `schedule-action-option-{action.key}` → each `<MenuItem>` in `MenuList` (create/update/toggleFixed/delete)
- `schedule-scope-toggle-group` → `<ToggleButtonGroup>`
- `schedule-scope-view` → View `<ToggleButton>`
- `schedule-scope-campaign` → Campaign `<ToggleButton>`
- `schedule-entity-select` → the `<Select>` inside entity FormControl
- `schedule-entity-option-{id}` → each entity `<MenuItem>` inside the select
- `schedule-delete-confirm-button` → confirm `<Button>` in deleteConfirm state
- `schedule-delete-cancel-button` → cancel `<Button>` in deleteConfirm state
- `schedule-close-selection-button` → exit `<IconButton>` (CloseIcon)
- `schedule-validation-error` → validation error `<Typography>`
- `schedule-selection-counts` → counts `<Typography>` showing "N cells, M assignments"

### 1b. `worker-cell.tsx`
- Add `worker-cell-{worker.id}-{dateStr}` on root `<TableCell>` (shift-cell already has its testid)
- Add `worker-cell-checkbox-{worker.id}-{dateStr}` on its inner `<Checkbox>`

### 1c. `shift-cell.tsx`
- Add `shift-cell-checkbox-{shift.id}-{dateStr}` on the inner `<Checkbox>`

### 1d. `shift-row-header-cell.tsx`
- Add `shift-row-checkbox-{shift.id}` on its `<Checkbox>`

### 1e. `worker-row-header-cell.tsx`
- Add `worker-row-checkbox-{worker.id}` on its `<Checkbox>`

### 1f. `date-header-cell.tsx`
- Add `date-column-checkbox-{dateStr}` on its `<Checkbox>`

(Note: `export-cell.tsx` already has `export-cell-select-all-checkbox` ✓)

---

## Phase 2 — Three test files

### File A: `frontend/tests/e2e/schedule/selection/selection-access.spec.ts`

**Setup:** `setupScheduleTests` with no assignments + `linkMemberToWorker: true` (so member can load the page).

**Tests:**
1. Member cannot see the settings-selection-mode-button — act as member, open `schedule-settings-button` popover, assert `settings-selection-mode-button` is not visible.
2. Leader sees settings-selection-mode-button — act as owner, open settings popover, assert `settings-selection-mode-button` is visible.
3. Leader can enable selection mode — click `settings-selection-mode-button`, assert `schedule-action-toolbar` becomes visible.
4. Leader can disable selection mode — enable selection mode, click `schedule-close-selection-button`, assert `schedule-action-toolbar` becomes invisible.

---

### File B: `frontend/tests/e2e/schedule/selection/selection-interaction.spec.ts`

**Two describe blocks** (same test logic, different groupBy): run for `groupBy = "shift"` and `groupBy = "worker"`.

**Setup pattern (shared helper):**
- `setupScheduleTests` with `createAssignments: true`, `linkMemberToWorker: false`, `referenceDate: dayjs.utc()`.
- `setScheduleViewSettings(page, { groupBy, targetDate: referenceDate, timeFrame: "week" })`.
- Then **open settings and click selection mode** to enter it, so toolbar is visible.

**Tests (repeated for both views):**

1. **Select/unselect individual cell** — find one cell checkbox (using `shift-cell-checkbox-{id}-{date}` or `worker-cell-checkbox-{id}-{date}`), click it, assert `schedule-selection-counts` shows "1 cell". Click again, assert counts show nothing.

2. **Select/unselect individual assignment** — find `assignment-cell-{assignmentId}` element (from pre-created assignments), click it, assert `schedule-selection-counts` shows "1 assignment". Click again, deselected.

3. **Column checkbox selects/deselects all cells + assignments in that column** — click `date-column-checkbox-{date}`, assert all cells in that column are highlighted (check count reflects full column). Click again, assert all deselected.

4. **Row checkbox (view scope) selects/deselects all cells + assignments in row** — ensure scope is "view" (default), click `shift-row-checkbox-{id}` / `worker-row-checkbox-{id}`, assert selection count = number of dates in current week × 1 row. Click again, deselected.

5. **Row checkbox (campaign scope) selects across campaign** — needs campaign: use a separate test that calls `createCampaignSchedule` via `scheduleTestBase.createCampaignSchedule()` after basic setup, then switch scope to "campaign" via `schedule-scope-campaign` button, click row checkbox, assert selection count = campaign days × 1 row. Click again, deselected.

6. **Top-left checkbox selects/deselects all** — click `export-cell-select-all-checkbox`, assert all cells and assignments are selected (count = rowCount × dateCount + assignmentCount). Click again, all deselected.

7. **Switching scope deselects out-of-range cells** — needs campaign: select all in "campaign" scope (large count), switch to "view" via `schedule-scope-view`, assert count drops to only view-period cells.

8. **Switching groupBy clears selection** — select some cells (e.g., click select-all), change groupBy via `setScheduleViewSettings(page, { groupBy: otherView }, true)` (page reload applies), verify `schedule-selection-counts` is empty (no selections persisted across groupBy change / page reload resets React state).

Note: Tests 5 and 7 require campaign so each will call `scheduleTestBase.createCampaignSchedule()` in a dedicated `beforeEach` or inline setup. Create as separate nested `describe("with campaign", ...)` block.

---

### File C: `frontend/tests/e2e/schedule/selection/selection-toolbar.spec.ts`

**Setup:** `setupScheduleTests` with `createAssignments: true`, `groupBy: "shift"` via setScheduleViewSettings, then enter selection mode.

**Tests:**

1. **Scope toggle absent with no campaign** — assert `schedule-scope-toggle-group` is not visible when `scheduleCampaign` is null.

2. **Scope toggle present with campaign** — after `scheduleTestBase.createCampaignSchedule(...)`, reload page, enter selection mode, assert `schedule-scope-toggle-group` is visible, both `schedule-scope-view` and `schedule-scope-campaign` are present.

3. **Dropdown shows all 4 action options** — click `schedule-action-dropdown-toggle`, assert 4 items are visible: `schedule-action-option-create`, `schedule-action-option-update`, `schedule-action-option-toggleFixed`, `schedule-action-option-delete`.

4. **Entity select shown for create/update, hidden for toggleFixed/delete** — default is "create"; assert `schedule-entity-select` visible. Switch to "update" via dropdown → entity select still visible. Switch to "toggleFixed" → entity select gone. Switch to "delete" → entity select gone.

5. **Validation: create with no cells selected** — clear all selections, click `schedule-action-main-button`, assert `schedule-validation-error` visible with cell-related message.

6. **Validation: create with cells but no entity** — select cells via `export-cell-select-all-checkbox`, leave entity select empty, click action button, assert entity-related `schedule-validation-error`.

7. **Validation: update with no assignments** — switch to "update", select only cells (no assignments), click action button, assert assignment-related error.

8. **Validation: update with assignments but no entity** — pre-select assignments, click action button without entity, assert entity error.

9. **Validation: toggleFixed with no assignments selected** — switch to "toggleFixed", ensure no assignments selected, click action button, assert error.

10. **Validation: delete with no assignments selected** — switch to "delete", no assignments selected, click action button, assert error.

11. **Delete confirmation flow** — select assignments, switch to "delete", click action button → `schedule-delete-confirm-button` appears. Click `schedule-delete-cancel-button` → confirmation dismissed, no delete. Repeat, click `schedule-delete-confirm-button` → assignments deleted; verify via `getAssignmentsAndRecurrences`.

12. **Bulk create** — select empty cells (shift view: all cells in one row), pick a worker in entity select, click action button → assert new assignments created via `getAssignmentsAndRecurrences`.

13. **Bulk update** — pre-select existing assignments, pick a different shift in entity select, click action button → verify assignments updated via `getAssignmentsAndRecurrences`.

14. **Bulk toggle fixed** — select assignments with `fixed: false`, switch to "toggleFixed", click action button → verify assignments now have `fixed: true`.

15. **Bulk delete** — select assignments, switch to "delete", confirm → verify they no longer appear in `getAssignmentsAndRecurrences`.

16. **Close button exits selection mode** — click `schedule-close-selection-button`, assert `schedule-action-toolbar` is gone.

---

## Relevant files

- `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx` — add testids (Phase 1a)
- `frontend/src/components/schedule/table/worker-table/worker-cell.tsx` — add testids (Phase 1b)
- `frontend/src/components/schedule/table/shift-table/shift-cell.tsx` — add checkbox testid (Phase 1c)
- `frontend/src/components/schedule/table/shift-table/shift-row-header-cell.tsx` — add checkbox testid (Phase 1d)
- `frontend/src/components/schedule/table/worker-table/worker-row-header-cell.tsx` — add checkbox testid (Phase 1e)
- `frontend/src/components/schedule/table/shared/date-header-cell.tsx` — add checkbox testid (Phase 1f)
- `frontend/src/components/schedule/nav-bar/schedule-settings.tsx` — existing `settings-selection-mode-button` and `schedule-settings-button` testids already present ✓
- `frontend/tests/e2e/schedule/selection/selection-access.spec.ts` — **new file** (Phase 2A)
- `frontend/tests/e2e/schedule/selection/selection-interaction.spec.ts` — **new file** (Phase 2B)
- `frontend/tests/e2e/schedule/selection/selection-toolbar.spec.ts` — **new file** (Phase 2C)
- `frontend/tests/utils/schedule-test-base.ts` — reuse `setupScheduleTests`, `setScheduleViewSettings`, `createCampaignSchedule`, `getAssignmentsAndRecurrences` (no changes needed)

---

## Verification
1. Run `npx tsc --noEmit` from `frontend/` after Phase 1 to ensure no type errors introduced by added testids.
2. Confirm all new test files compile by running `npx tsc --noEmit` (includes tests).
3. Manual smoke test: open schedule page, enter selection mode, verify toolbar and checkboxes render.
4. Do NOT run the full Playwright test suite (per user instructions).

---

## Decisions
- Multiple files: `selection-access.spec.ts`, `selection-interaction.spec.ts`, `selection-toolbar.spec.ts` under new folder `selection/`.
- Desktop only: all tests use default viewport (no `setMobileViewport`).
- API-created test data for all pre-conditions (workers, shifts, assignments, campaigns); UI interactions only for the things under test.
- Selection view settings (periodStartDate, groupBy, timeFrame) set via `setScheduleViewSettings` localStorage util.
- Use `testBasesMap` + `randomUUID` pattern matching existing tests for parallel isolation.
- `groupBy` change test relies on page reload clearing React state (no new implementation needed).
- Campaign scope tests use nested `describe("with campaign")` block with `createCampaignSchedule` called inline (not in the shared beforeEach).
- Phase 1 (testids) must complete before Phase 2 (test files) as tests reference those testid strings.
