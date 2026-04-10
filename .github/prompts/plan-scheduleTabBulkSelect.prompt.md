# Plan: Schedule Tab Bulk Select Feature

## Summary
Add a selection mode to ScheduleTab (desktop only, OWNER only) that lets users multi-select cells and assignments to perform bulk CRUD operations. Toggled from the Settings > Tools panel. Shows an action toolbar (like ShiftDemandActionToolbar) when active. Supports shift view and worker view, current period scope, and full campaign scope.

---

## Key Decisions
- **Bulk create UX**: Inline worker/shift dropdown in action toolbar (not a dialog per cell)
- **Campaign scope**: Row/column/table "select all" can span ALL campaign dates (outside current view)
- **Fixed toggle**: Toggle fixed/unfixed on selected assignments only
- **Cell vs assignment**: Cell clicks (empty or cell background) = creation target; assignment chip clicks = select that assignment
- **Role access**: OWNER only

---

## Types to Add
### New file: `frontend/src/types/scheduleSelection.ts`
```typescript
export interface SelectedScheduleCell {
  rowId: string;      // shiftId (shift view) or workerId (worker view)
  date: string;       // "YYYY-MM-DD"
  scheduleId: string | null;
}

export interface ScheduleSelectionState {
  isActive: boolean;
  selectedCells: SelectedScheduleCell[];        // empty cells targeted for creation
  selectedAssignmentIds: string[];              // existing assignments targeted for edit/delete
}
```

---

## Phases

### Phase 0 — Backend: Bulk API (new endpoints + service methods)
**All steps in this phase can be implemented in parallel.**

0a. **Add bulk DTOs** to `backend/shared/src/shared/schemas/dto/assignment.py`:
  - `BulkAssignmentCreateDTO` — list of `AssignmentDTO` (no recurrence; bulk creates are always non-recurring)
  - `BulkAssignmentUpdateDTO` — list of `AssignmentDTO` (full replacement of each, used for both field updates and fixed toggle)
  - `BulkAssignmentDeleteDTO` — list of assignment IDs (`ids: List[str]`)

0b. **Add bulk service methods** to `backend/api_gateway/src/services/assignment_service.py`:
  - `bulk_create_assignments(assignments: List[Assignment]) -> AssignmentsRecurrencesResult`
    - Loop over each, call `self.collection.assignment_db.create_assignments(assignments)` in one DB call; run recuperation logic across the batch
  - `bulk_update_assignments(assignments: List[Assignment]) -> AssignmentsRecurrencesResult`
    - Loop over each, call `_update_main_assignment` + `_udpdate_recup_assignments`; aggregate results across batch
  - `bulk_delete_assignments(assignment_ids: List[str]) -> AssignmentsRecurrencesResult`
    - Delete each + their recuperation references; aggregate deleted IDs

0c. **Add bulk endpoints** to `backend/api_gateway/src/routes/assignment_routes.py` (*depends on 0a, 0b*):
  - `POST /assignments/bulk/teams/{team_id}` — auth: `create-assignment`; body: `BulkAssignmentCreateDTO`
  - `PUT /assignments/bulk/teams/{team_id}` — auth: `update-assignment`; body: `BulkAssignmentUpdateDTO`
  - `DELETE /assignments/bulk/teams/{team_id}` — auth: `delete-assignment`; body: `BulkAssignmentDeleteDTO`
  - All three return `AssignmentsRecurrencesResultDTO` (reuses existing shape)

0d. **Add bulk API client methods** to `frontend/src/app/lib/api/assignmentApi.ts`:
  - `bulkCreateAssignments(apiClient, assignments: AssignmentT[], teamId)` → `POST /assignments/bulk/teams/{team_id}`
  - `bulkUpdateAssignments(apiClient, assignments: AssignmentT[], teamId)` → `PUT /assignments/bulk/teams/{team_id}`
  - `bulkDeleteAssignments(apiClient, assignmentIds: string[], teamId)` → `DELETE /assignments/bulk/teams/{team_id}`

0e. **Add bulk mutation hooks** to `frontend/src/hooks/useAssignment.ts`:
  - `useBulkCreateAssignments()`, `useBulkUpdateAssignments()`, `useBulkDeleteAssignments()`
  - Each invalidates `assignmentsQueryKeys.teams(teamId)` on success

---

### Phase 1: Types & Selection State
1. Create `frontend/src/types/scheduleSelection.ts` with types above
2. In `schedule-tab.tsx`: add `selectionState` with useState + handlers:
   - `handleToggleSelectionMode()` — toggle isActive, clear selection on deactivate
   - `handleCellSelect(rowId, date, scheduleId)` — add/remove from selectedCells
   - `handleAssignmentSelect(assignmentId)` — add/remove from selectedAssignmentIds
   - `handleRowSelect(rowId, scope)` — select all cells in that row for current view or campaign
   - `handleColumnSelect(date, scope)` — select all cells in that column
   - `handleSelectAll(scope)` — select everything in view or campaign

### Phase 2: Toggle in Settings
3. In `schedule-settings.tsx`: add a `MenuItem` "Select" toggle (checkmark-style) inside the Tools section block around line 198; wire `onToggleSelectionMode` + `isSelectionModeActive` props from ScheduleNavBar → ScheduleSettings
4. In `schedule-nav-bar.tsx`: add `onToggleSelectionMode` + `isSelectionModeActive` props and pipe them down to `<ScheduleSettings>`

### Phase 3: ScheduleActionToolbar Component
5. Create `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx`:
   - Shows when `selectionState.isActive`
   - Layout: [Selection counts] | [Create section] | [Update section] | [Toggle Fixed] | [Delete] | [Scope toggle] | [Cancel]
   - **Create section**: inline dropdown (workers when shift view, shifts when worker view) + "Create" button → calls `useBulkCreateAssignments`
   - **Update section**: same inline dropdown + "Update" button (applies to selectedAssignmentIds) → calls `useBulkUpdateAssignments`
   - **Toggle Fixed button**: applies to selectedAssignmentIds → calls `useBulkUpdateAssignments` with flipped `fixed`
   - **Delete button**: with inline confirmation, applies to selectedAssignmentIds → calls `useBulkDeleteAssignments`
   - **Scope toggle** (view | campaign): `ToggleButtonGroup`, shown only when `scheduleCampaign` exists
   - **Cancel button**: calls `handleToggleSelectionMode`
   - Reference: `frontend/src/components/shiftDemand/toolbar/ShiftDemandActionToolbar.tsx`

### Phase 4: Wire Toolbar into ScheduleTab
6. In `schedule-tab.tsx`: render `<ScheduleActionToolbar>` between `<ScheduleNavBar>` and `<ScheduleDisplay>` (OWNER + desktop only)
7. Pass bulk hooks from Phase 0e as prop callbacks into the toolbar
8. Add bulk operation handlers in `schedule-tab.tsx`:
   - `handleBulkCreateAssignments(id)` — builds AssignmentT list from selectedCells + given workerId/shiftId, calls bulk create hook
   - `handleBulkUpdateAssignments(id)` — builds updated AssignmentT list from selectedAssignmentIds + given workerId/shiftId, calls bulk update hook
   - `handleBulkDeleteAssignments()` — passes selectedAssignmentIds to bulk delete hook
   - `handleBulkToggleFixed()` — fetches current fixed state per assignment, flips, calls bulk update hook

### Phase 5: Cell & Row/Column Selection UI
9. Pass `selectionState` + all selection handlers down through:
   `ScheduleDisplay → ScheduleTableShift/ScheduleTableWorker → ShiftTableRow/WorkerTableRow → ShiftCell/WorkerCell → AssignmentCell`
10. Modify `ShiftCell` / `WorkerCell`:
    - In selection mode: clicking cell background calls `handleCellSelect`; highlight selected cells
    - Assignment clicks call `handleAssignmentSelect` instead of `handleAssignmentSelection`
11. Modify `AssignmentCell`:
    - In selection mode: show selection border/highlight; click → `handleAssignmentSelect`
12. Modify `ScheduleTableShift` (shift view header row):
    - Corner cell: onClick → `handleSelectAll`
    - Date column header cells: onClick → `handleColumnSelect`
13. Modify `ShiftTableRow`:
    - Shift row header cell: onClick → `handleRowSelect`
14. Same changes for worker view (`ScheduleTableWorker`, `WorkerTableRow`)

### Phase 6: Campaign Scope
15. `handleRowSelect` / `handleColumnSelect` / `handleSelectAll`: when `scope === "campaign"` and `scheduleCampaign` exists, generate all dates from `scheduleCampaign.startDate` to `scheduleCampaign.endDate` (not just periodDates)
16. Scope toggle in `ScheduleActionToolbar` renders as `ToggleButtonGroup` (view | campaign) — only when campaign exists

---

## Relevant Files

### Backend
- `backend/shared/src/shared/schemas/dto/assignment.py` — add `BulkAssignmentCreateDTO`, `BulkAssignmentUpdateDTO`, `BulkAssignmentDeleteDTO`
- `backend/api_gateway/src/services/assignment_service.py` — add `bulk_create_assignments`, `bulk_update_assignments`, `bulk_delete_assignments`
- `backend/api_gateway/src/routes/assignment_routes.py` — add 3 bulk endpoints

### Frontend
- `frontend/src/app/lib/api/assignmentApi.ts` — add `bulkCreateAssignments`, `bulkUpdateAssignments`, `bulkDeleteAssignments`
- `frontend/src/hooks/useAssignment.ts` — add `useBulkCreateAssignments`, `useBulkUpdateAssignments`, `useBulkDeleteAssignments`
- `frontend/src/components/schedule/schedule-tab.tsx` — main state, handlers, layout
- `frontend/src/components/schedule/nav-bar/schedule-settings.tsx` — add "Select" toggle
- `frontend/src/components/schedule/nav-bar/schedule-nav-bar.tsx` — pipe `onToggleSelectionMode` + `isSelectionModeActive` props
- `frontend/src/components/schedule/table/schedule-display.tsx` — pipe selection props
- `frontend/src/components/schedule/table/shift-table/schedule-table-shift.tsx` — corner cell + column header clicks
- `frontend/src/components/schedule/table/shift-table/shift-table-row.tsx` — row header click
- `frontend/src/components/schedule/table/shift-table/shift-cell.tsx` — cell selection mode
- `frontend/src/components/schedule/table/worker-table/schedule-table-worker.tsx` — same
- `frontend/src/components/schedule/table/worker-table/worker-table-row.tsx` — same
- `frontend/src/components/schedule/table/worker-table/worker-cell.tsx` — same
- `frontend/src/components/schedule/table/shared/assignment-cell.tsx` — selection indicator
- (NEW) `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx`
- (NEW) `frontend/src/types/scheduleSelection.ts`
- Reference: `frontend/src/components/shiftDemand/toolbar/ShiftDemandActionToolbar.tsx`
- Reference: `frontend/src/types/schedule.ts` — ScheduleViewSettingsT (groupBy: "shift" | "worker")

---

## Verification
1. `POST/PUT/DELETE /assignments/bulk/teams/{team_id}` — test each, verify auth rejection for non-owners
2. Toggle "Select" in Settings (OWNER only) → action toolbar appears; `isMobile` guard hides it
3. Cell background click → highlights; assignment chip click → distinct highlight; click again → deselects
4. Row/column/corner header clicks select expected cells in view scope
5. Campaign scope toggle → row expands to full campaign date range
6. Toolbar: pick worker (shift-view) → Create → new assignments appear after React Query invalidation
7. Toolbar: Toggle Fixed → `fixed` flips on all selected assignments
8. Toolbar: Delete → inline confirmation → assignments removed, query invalidated
9. Cancel → mode exits, normal click behavior restored
10. Desktop only — `isMobile` guard prevents rendering on mobile

---

## Reference: Current API

### Assignment Model Fields (`backend/shared/src/shared/schemas/core/assignment.py`)
- `id: str`, `team_id: str`, `schedule_id: str | None`, `worker_id: str`
- `date: date`, `shift_id: str`, `fixed: bool` ✓
- `source: AssignmentSource` (MANUAL, SOLVER, DUPLICATE, RECURRENCE, REQUEST)
- `source_id: str | None`, `reference_assignment_id: str | None` (recuperation links)

### AssignmentDTO Fields (`backend/shared/src/shared/schemas/dto/assignment.py`)
- `id: str`, `teamId: str`, `scheduleId: str | None`, `workerId: str`
- `date: float` (Unix timestamp), `shiftId: str`, `fixed: bool`
- `source: str`, `referenceAssignmentId: str | None`, `sourceId: str | None`

### AssignmentsRecurrencesResultDTO (reused for bulk responses)
```python
assignmentsCreated: List[AssignmentDTO]
assignmentsRead: List[AssignmentDTO]
assignmentsUpdated: List[AssignmentDTO]
assignmentsDeletedIds: List[str]
recurrenceCreated: RecurrenceRuleDTO | None
recurrencesRead: List[RecurrenceRuleDTO]
recurrenceUpdated: RecurrenceRuleDTO | None
recurrencesDeletedIds: List[str]
```

### Current Single-Item Endpoints (unchanged)
1. `POST /assignments/teams/{team_id}` — create single assignment ± recurrence
2. `GET /assignments/teams/{team_id}` — get by date range
3. `PUT /assignments/{assignment_id}/teams/{team_id}` — update single
4. `DELETE /assignments/{assignment_id}/teams/{team_id}` — delete single
5. `GET /assignments/{assignment_id}/replacement-candidates/teams/{team_id}`

---

## Further Considerations
1. **Bulk delete + recurrences**: If a selected assignment is recurrence-sourced, bulk delete applies "this occurrence only" silently (no scope dialog). Keeps bulk UX simple.
2. **Partial failure**: If bulk update/delete partially fails (e.g., 3 of 10 succeed), current plan returns whatever succeeded. Consider whether to surface a partial-failure toast or roll back all.
3. **Recuperation handling**: Embedded in service methods — updating a DUTY shift auto-manages paired recuperation assignments. Bulk service methods must preserve this behaviour.
