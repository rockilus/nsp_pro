# Plan v2: Fix Campaign Scope Bulk Operations via Server-Side Resolution

## Problem
When scope = "campaign", `selectedAssignmentIds` filters the in-memory 3-month buffer.
Assignments outside the buffer are silently missed in bulk delete/update/toggleFixed.
Additionally, assignments loaded as the user navigates the campaign don't auto-join the selection.

## Approach
- Introduce `AssignmentBulkFilter` + `AssignmentFieldPatch` DTOs in shared
- `BulkAssignmentDeleteDTO` and `BulkAssignmentUpdateDTO` gain optional filter+patch
- Backend resolves matching assignments from DB, unions with explicit IDs, and operates
- Frontend derives the filter at operation time from `selectedCells` (already spans full campaign)
- Auto-follow: a useEffect on `assignments` auto-adds IDs whose (rowId,date) is in `selectedCells`

## Steps

### Phase 1 — Shared DTOs (backend/shared)
1. `backend/shared/src/shared/schemas/dto/assignment.py` — add two new models:
   - `AssignmentBulkFilter`: `startDate: date`, `endDate: date`,
     `workerIds: Optional[List[str]] = None`, `shiftIds: Optional[List[str]] = None`
   - `AssignmentFieldPatch`: `workerId: Optional[str] = None`, `shiftId: Optional[str] = None`,
     `fixed: Optional[bool] = None`, `toggleFixed: bool = False`
2. `BulkAssignmentDeleteDTO` — add `filter: Optional[AssignmentBulkFilter] = None`
3. `BulkAssignmentUpdateDTO` — add `filter: Optional[AssignmentBulkFilter] = None`,
   `patch: Optional[AssignmentFieldPatch] = None`

### Phase 2 — DB Repository (backend/shared) [parallel with Phase 1]
4. `backend/shared/src/shared/database/repositories/assignment.py` — add:
   `get_assignments_by_filter(team_id, start_date, end_date, worker_ids=None, shift_ids=None)`
   MongoDB query: `{team: team_id, date: {$gte, $lte}, worker: {$in} (if given), shift: {$in} (if given)}`
   (mirrors existing `get_assignments_by_team_and_shifts_today_onward` pattern)

### Phase 3 — Service layer (backend/api_gateway) [depends on Phase 1+2]
5. `backend/api_gateway/src/services/assignment_service.py` — update `bulk_delete_assignments`:
   - If filter provided: call `get_assignments_by_filter` to resolve additional IDs
   - Final ID set = union(explicit ids, filter-resolved IDs)
   - Use existing `assignment_db.delete_assignments($in)` for batch efficiency
6. Update `bulk_update_assignments`:
   - If filter+patch provided: call `get_assignments_by_filter`, remove IDs already in explicit list
   - Apply patch to remaining (set worker_id/shift_id, or toggle fixed if `patch.toggle_fixed=True`)
   - Merge explicit + patched assignments; update all

### Phase 4 — Frontend types [parallel with Phase 3]
7. `frontend/src/types/assignment.ts` — add `AssignmentBulkFilterT` and `AssignmentFieldPatchT`
   types + `fromAssignmentBulkFilterT` and `fromAssignmentFieldPatchT` serializers (camelCase → snake_case for body)

### Phase 5 — Frontend API + Hooks [depends on Phase 4]
8. `frontend/src/app/lib/api/assignmentApi.ts` — `bulkDeleteAssignments` and `bulkUpdateAssignments`
   accept optional `filter?: AssignmentBulkFilterT` and `patch?: AssignmentFieldPatchT`; include in body
9. `frontend/src/hooks/useAssignment.ts` — propagate new params through the two hooks

### Phase 6 — schedule-tab: derive filter + bulk handlers [depends on Phase 5]
10. Add helper `buildBulkFilterFromSelection(): AssignmentBulkFilterT | null`:
    - Returns null if `selectionScope !== "campaign"` or `selectedCells` is empty
    - startDate = min date in selectedCells, endDate = max date
    - workerIds/shiftIds = unique rowIds mapped by groupBy
11. `handleBulkDeleteAssignments` — pass `buildBulkFilterFromSelection()` as `filter`
12. `handleBulkUpdateAssignments` — pass filter + patch `{workerId: id}` or `{shiftId: id}`
13. `handleBulkToggleFixed` — pass filter + patch `{toggleFixed: true}`

### Phase 7 — Auto-follow useEffect [parallel with Phase 6]
14. In `schedule-tab.tsx`, add a useEffect watching `assignments`:
    - Early return if `!selectionState.isActive || selectedCells.length === 0`
    - Build `cellKeys = new Set(selectedCells.map(c => c.rowId+"-"+c.date))`
    - Per assignment, derive `rowId` via groupBy (workerId or shiftId)
    - Collect IDs not yet in `selectedAssignmentIds` whose cell-key is in `cellKeys`
    - If any: `setSelectionState(prev => ({ ...prev, selectedAssignmentIds: [...prev.selectedAssignmentIds, ...newIds] }))`

## Relevant files
- `backend/shared/src/shared/schemas/dto/assignment.py` — Phase 1
- `backend/shared/src/shared/database/repositories/assignment.py` — Phase 2
- `backend/api_gateway/src/services/assignment_service.py` — Phase 3
- `frontend/src/types/assignment.ts` — Phase 4
- `frontend/src/app/lib/api/assignmentApi.ts` — Phase 5
- `frontend/src/hooks/useAssignment.ts` — Phase 5
- `frontend/src/components/schedule/schedule-tab.tsx` — Phases 6 & 7
- `frontend/src/types/scheduleSelection.ts` — NO changes

## Verification
1. Backend unit test: `bulk_delete_assignments(ids=[], filter=AssignmentBulkFilter(startDate, endDate, shiftIds=["s1"]))` deletes all matching assignments
2. Backend unit test: toggleFixed via patch toggles `fixed` on filter-resolved assignments
3. `cd frontend && npx tsc --noEmit` — no errors
4. Auto-follow manual test: enter campaign scope selection → navigate to a new period → newly loaded matching assignments appear selected
5. E2E: 6-month campaign, navigate to middle months, campaign-scope select-all → delete → zero assignments remain across full campaign
6. Regression: `pytest` in backend/api_gateway

## Decisions / scope
- `BulkAssignmentCreateDTO` excluded — bug does not affect create (selectedCells already span full campaign)
- `ScheduleSelectionState` unchanged — no new fields needed
- `handleColumnSelect` excluded — always a single visible date
- Backend resolves only assignments belonging to the team_id (safety guard implicit in DB query)
