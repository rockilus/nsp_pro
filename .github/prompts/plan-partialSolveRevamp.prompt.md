# Plan: Revamp Partial Solve Frontend

**TL;DR**: Three-part revamp — (1) split button becomes select-then-fire with sparkle + chosen label on the main button; (2) choosing CUSTOM activates a new interactive "custom solve mode" in the table where sparkle icons on row/column headers and `DailyShiftDemandCell` let users build the scope; (3) `CustomSolveDialog` becomes a summary-only confirmation (no checkboxes). Nothing is pre-selected when entering CUSTOM mode.

---

## Phase 1 — Lift solve-scope state to `schedule-tab.tsx`
2. Add `selectedSolveScope: SolveScopeType` state (default `"FULL"`)
3. Add `customSolveSelectedCells: SelectedScheduleCell[]` state (default `[]`)
4. Add `useEffect` to clear `customSolveSelectedCells` when `selectedSolveScope` changes away from `"CUSTOM"`
5. Derive `isCustomSolveModeActive = selectedSolveScope === "CUSTOM"` inline
6. Add three handlers (read `workers`, `shifts`, `scheduleCampaign` for all campaign dates):
   - `handleCustomRowSelect(rowId)` — toggle all campaign dates for that rowId
   - `handleCustomColumnSelect(date, rowIds)` — toggle all rowIds for that date
   - `handleCustomCellSelect(rowId, date)` — toggle specific (rowId, date) pair
   - Local utility `buildCustomSolveScope(cells, groupBy)` → `SolveScope`

---

## Phase 2 — Thread new props through ScheduleNavBar *(depends on Phase 1)*
7. Add `selectedSolveScope`, `onSolveOptionChange`, `customSolveSelectedCells` to `ScheduleNavBar` and forward to `CampaignInfo`

---

## Phase 3 — Revamp `CampaignInfo` split button *(depends on Phase 2)*
8. Accept `selectedSolveScope` + `onSolveOptionChange` as controlled props (remove internal scope state)
9. Label map (local const): `{FULL: "solve_full_campaign", DUTIES: "solve_duties", ...}`
10. Main button renders: `<Sparkles size={14}/> {t(labelMap[selectedSolveScope])}` — no immediate solve on dropdown selection
11. Each `<MenuItem>` click: calls `onSolveOptionChange(scopeType)` only, no `handleSolve()`
12. Main button `onClick`: CUSTOM → `setCustomDialogOpen(true)`; others → `handleSolve({scope_type: selectedSolveScope})`
13. Remove `AutoAwesomeIcon` from the CUSTOM `MenuItem` (sparkle is on the main button only)
14. Pass `customSolveSelectedCells` to `CustomSolveDialog` as its selection input

---

## Phase 4 — Revamp `CustomSolveDialog` to summary-only *(depends on Phase 3)*
15. Replace all internal checkbox state with a single `customSolveSelectedCells: SelectedScheduleCell[]` prop
16. `useMemo` derives unique rowIds → resolved names from `workers`/`shifts`; unique dates → formatted list
17. Remove `buildCampaignDates`, all toggle helpers
18. `handleConfirm` builds `SolveScope` from `customSolveSelectedCells` + `groupBy` → calls `onConfirm(scope)`
19. Dialog body: summary card — "X workers, Y dates selected" + scrollable list of names/dates; replace checkbox grid
20. Confirm disabled when `customSolveSelectedCells.length === 0`

---

## Phase 5 — Thread custom solve props through table hierarchy *(depends on Phase 1; parallel with Phase 2–4)*
Props: `isCustomSolveModeActive`, `customSolveSelectedCells`, `handleCustomRowSelect`, `handleCustomColumnSelect`, `handleCustomCellSelect`

21. `schedule-tab.tsx` → **ScheduleDisplay**
22. **ScheduleDisplay** → **ScheduleTableWorker** + **ScheduleTableShift**
23. Tables → **DatesHeaderRow** → **DateHeaderCell** (column sparkle)
24. **WorkerTableRow** derives `isRowCustomSelected` / `isRowCustomIndeterminate` → **WorkerRowHeaderCell** (row sparkle)
25. **ShiftTableRow** same derivation → **ShiftRowHeaderCell** (row sparkle)
26. **ShiftCell** derives `isCustomCellSelected` from cells → **DailyShiftDemandCell** (cell sparkle)

---

## Phase 6 — Add `Sparkles` icon to UI components *(depends on Phase 5)*
27. **WorkerRowHeaderCell** & **ShiftRowHeaderCell**: render `<Sparkles size={14}/>` in same position as existing `Checkbox` when `isCustomSolveModeActive`; clicking calls `onCustomRowSelect()`; visually distinct when indeterminate
28. **DateHeaderCell**: render `<Sparkles size={14}/>` when `isCustomSolveModeActive`; clicking calls `handleCustomColumnSelect(date, rowIds)`
29. **DailyShiftDemandCell**: render small absolute-positioned `<Sparkles size={12}/>` (same corner as `AssignmentCell` checkbox) when `isCustomSolveModeActive`; clicking calls `onCustomCellSelect()`; highlighted when `isCustomCellSelected`

---

## Phase 7 — i18n updates *(parallel with Phase 4)*
30. Add to `en/schedule-page.json` (and `es`, `fr`):
    - `solve_custom_summary_empty` — empty-state message in dialog
    - `solve_custom_summary_workers_count`, `solve_custom_summary_shifts_count`, `solve_custom_summary_dates_count`

---

## Relevant Files

| File | Change |
|---|---|
| `frontend/package.json` | add lucide-react |
| `frontend/src/components/schedule/schedule-tab.tsx` | selectedSolveScope, customSolveSelectedCells, all handlers |
| `frontend/src/components/schedule/nav-bar/schedule-nav-bar.tsx` | thread 3 new props |
| `frontend/src/components/schedule/nav-bar/campaign-info.tsx` | split button revamp |
| `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx` | summary-only dialog |
| `frontend/src/components/schedule/table/schedule-display.tsx` | thread props |
| `frontend/src/components/schedule/table/shift-table/schedule-table-shift.tsx` | thread props |
| `frontend/src/components/schedule/table/worker-table/schedule-table-worker.tsx` | thread props |
| `frontend/src/components/schedule/table/shift-table/shift-table-row.tsx` | derive row custom states |
| `frontend/src/components/schedule/table/worker-table/worker-table-row.tsx` | derive row custom states |
| `frontend/src/components/schedule/table/worker-table/worker-row-header-cell.tsx` | sparkle icon |
| `frontend/src/components/schedule/table/shift-table/shift-row-header-cell.tsx` | sparkle icon |
| `frontend/src/components/schedule/table/shared/dates-header-row.tsx` | thread to DateHeaderCell |
| `frontend/src/components/schedule/table/shared/date-header-cell.tsx` | sparkle icon |
| `frontend/src/components/schedule/table/shared/daily-shift-demand-cell.tsx` | sparkle icon |
| `frontend/src/components/schedule/table/shift-table/shift-cell.tsx` | thread to DailyShiftDemandCell |
| `frontend/src/app/i18n/locales/{en,es,fr}/schedule-page.json` | new summary keys |

---

## Verification
1. `cd frontend && npx tsc --noEmit` — zero new TypeScript errors
2. Clicking any dropdown option changes the main button label only — no solve fires
3. FULL/DUTIES/NON_DUTIES main button click → solve fires with correct scope
4. CUSTOM main button click → dialog opens (no solve yet)
5. CUSTOM mode: sparkle icons appear in row headers, column headers, `DailyShiftDemandCells`; clicking them toggles into `customSolveSelectedCells`; indeterminate state on rows/columns works correctly
6. `CustomSolveDialog` shows summary; Confirm disabled when empty; confirming fires the solve
7. Switching away from CUSTOM clears `customSolveSelectedCells`

---

## Further Considerations
- **`ExportCell` in top-left corner** (`dates-header-row.tsx`): consider whether the top-left corner select-all should also show a sparkle "select all" when in custom mode — probably yes, handled in Phase 5 via `handleCustomSelectAll`
- **Accessibility**: the sparkle icons acting as toggles should have `role="checkbox"` + `aria-checked` for screen readers
- **`selectionState` conflict**: if the user has active regular selection (isActive=true) and then switches to CUSTOM solve mode, both modes would be active simultaneously — may want to visually distinguish or disable selection mode when custom mode is active
