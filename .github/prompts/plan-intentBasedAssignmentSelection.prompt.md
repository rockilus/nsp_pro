# Plan: Intent-Based Selection for Campaign-Scope Bulk Operations

## TL;DR
Replace the current ID-list selection tracking with an intent-based model. The frontend tracks *criteria* (scope + row filters + exclusions) instead of resolved IDs. Backend gets new endpoints that accept criteria and resolve them server-side against MongoDB. This fixes the campaign-scope gap where unloaded assignments are skipped.

---

## Problem Summary

Current system:
- `ScheduleSelectionState.selectedAssignmentIds: string[]` — only contains IDs for assignments already loaded in the 3-month buffer
- `ScheduleSelectionState.selectedCells: SelectedScheduleCell[]` — similarly bounded by the loaded window
- When selecting a row/column/all in `campaign` scope, `handleRowSelect` calls `buildDates(campaign.startDate, campaign.endDate)` BUT only adds IDs from the currently loaded `assignments[]` array
- Scope change handler (`handleScopeChange`) prunes to valid dates — also bounded by loaded data
- Bulk operations (create/update/delete) iterate over `selectionState.selectedAssignmentIds` — if campaign spans months outside the loaded buffer, those assignments are simply missing

**Concrete bug:** User viewing March 2025, campaign runs Sept–Dec 2025. User selects entire row in campaign scope. Only assignments loaded in the 3-month buffer are added. Bulk delete misses ~4 months of assignments.

---

## Proposed Architecture: Intent-Based Selection

### Phase 1 — Frontend: New Selection State Types

**File to modify:** `frontend/src/types/scheduleSelection.ts`

Replace/augment `ScheduleSelectionState` with a discriminated union:

```typescript
// Keep existing for 'view' scope (IDs always loaded)
interface ExplicitSelection {
  type: 'explicit';
  selectedAssignmentIds: string[];
  selectedCells: SelectedScheduleCell[];
}

// New for 'campaign' scope — tracks intent, not IDs
interface ImplicitSelection {
  type: 'implicit';
  campaignId: string;
  selectedRowIds: string[];       // empty = all rows
  excludedAssignmentIds: string[]; // individual deselections post-implicit-select
  selectedCells: SelectedScheduleCell[]; // for 'create' operations (cells still needed)
}

type SelectionIntent = ExplicitSelection | ImplicitSelection;

export interface ScheduleSelectionState {
  isActive: boolean;
  scope: SelectionScope;
  intent: SelectionIntent;
}
```

**New helper:** `isAssignmentSelected(assignment: AssignmentT, state: ScheduleSelectionState): boolean`
- For `explicit`: check `selectedAssignmentIds.has(id)`
- For `implicit`: check campaignId match → not in excludedIds → selectedRowIds filter
- This drives checkbox rendering across the schedule grid

### Phase 2 — Frontend: Update Selection Handlers in `schedule-tab.tsx`

**File to modify:** `frontend/src/components/schedule/schedule-tab.tsx`

Handlers to update:
- `handleRowSelect(rowId, scope)` — when `scope === 'campaign'`: switch to implicit, add/remove rowId from `selectedRowIds`; when `scope === 'view'`: remain explicit with explicit assignment IDs
- `handleColumnSelect(date, rowIds, scope)` — view scope stays explicit; campaign scope adds date cells only (for create)
- `handleSelectAll(rowIds, scope)` — view scope stays explicit; campaign scope → implicit with empty `selectedRowIds` (means all rows)
- `handleCellSelect(rowId, date, scheduleId)` — unchanged (explicit cells for create)
- `handleScopeChange(newScope)` — reset intent to explicit empty when switching scopes
- `handleToggleSelectionMode` — reset everything

**Checkbox evaluation across the grid:** Components rendering each assignment cell call `isAssignmentSelected()` for their render — automatically works as new assignments load during navigation.

**Individual deselect:** When user unchecks a single assignment while in implicit mode → add its ID to `excludedAssignmentIds`. When all assignments in a row are excluded → optionally remove row from `selectedRowIds`.

### Phase 3 — Frontend: Update Bulk Action Handlers

**File to modify:** `frontend/src/components/schedule/schedule-tab.tsx`

**New strategy:**
- `handleBulkCreateAssignments(entityId)` — unchanged for view scope (cells are always loaded); for campaign scope, cells are also always explicit (user clicked them or selected column in a visible date). No change needed here since create always needs explicit date cells.
- `handleBulkUpdateAssignments(entityId)` — if `intent.type === 'implicit'`: call new `bulkUpdateByIntent` API with criteria; if `explicit`: existing flow
- `handleBulkToggleFixed()` — same split as above
- `handleBulkDeleteAssignments()` — same split: if implicit, call new `bulkDeleteByIntent` API

### Phase 4 — Frontend: New API Methods

**File to modify:** `frontend/src/app/lib/api/assignmentApi.ts`

Add two new methods:
- `bulkUpdateByIntent(apiClient, intent: SelectionIntentPayload, updateParams: BulkIntentUpdateParams, teamId)` → calls `PUT /assignments/bulk-intent/teams/{teamId}`
- `bulkDeleteByIntent(apiClient, intent: SelectionIntentPayload, teamId)` → calls `DELETE /assignments/bulk-intent/teams/{teamId}`

**New type:** `SelectionIntentPayload` (frontend-side DTO for the criteria)
```typescript
type SelectionIntentPayload = {
  campaignId: string;
  selectedRowWorkerIds: string[];  // empty = all workers
  selectedRowShiftIds: string[];   // empty = all shifts (only one populated based on groupBy)
  excludedAssignmentIds: string[];
};
```

**File to modify:** `frontend/src/hooks/useAssignment.ts` — add `useBulkUpdateByIntent` and `useBulkDeleteByIntent` hooks

### Phase 5 — Backend Shared DTO

**File to modify:** `backend/shared/src/shared/schemas/dto/assignment.py`

Add new DTOs:
```python
class SelectionIntentDTO(BaseModel):
    campaign_id: str
    selected_row_worker_ids: List[str] = []  # empty = all workers in campaign
    selected_row_shift_ids: List[str] = []   # empty = all shifts in campaign
    excluded_assignment_ids: List[str] = []

class BulkIntentUpdateDTO(BaseModel):
    intent: SelectionIntentDTO
    new_worker_id: Optional[str] = None   # for bulk update worker
    new_shift_id: Optional[str] = None    # for bulk update shift
    toggle_fixed: bool = False            # for toggleFixed operation

class BulkIntentDeleteDTO(BaseModel):
    intent: SelectionIntentDTO
```

### Phase 6 — Backend Service Layer

**File to modify:** `backend/api_gateway/src/services/assignment_service.py`

Add two new methods:
- `bulk_update_by_intent(intent: SelectionIntentDTO, new_worker_id, new_shift_id, toggle_fixed, team_id) -> AssignmentsRecurrencesResult`
  - Build MongoDB query from intent: `{schedule: campaign_id, worker: {$in: worker_ids} (if non-empty), _id: {$nin: excluded_ids} (if non-empty)}`
  - Fetch matching assignments via `assignment_db.get_assignments(query)`
  - Apply update (worker, shift, or fixed toggle) to each
  - Call `update_assignments(updated_list)` at DB layer directly (no recurrence for bulk)
- `bulk_delete_by_intent(intent: SelectionIntentDTO, team_id) -> AssignmentsRecurrencesResult`
  - Build and execute same query pattern
  - Fetch IDs, call `delete_assignments(ids)` at DB layer

### Phase 7 — Backend Routes

**File to modify:** `backend/api_gateway/src/routes/assignment_routes.py`

Add two new endpoints:
- `PUT /assignments/bulk-intent/teams/{team_id}` → `bulk_update_assignments_by_intent()`
  - AuthZ: `update-assignment` on `team`
  - Validates `intent.campaign_id` belongs to `team_id` (security: prevent cross-team access)
  - Calls `assignment_service.bulk_update_by_intent(...)`
  - Sends notifications
- `DELETE /assignments/bulk-intent/teams/{team_id}` → `bulk_delete_assignments_by_intent()`
  - AuthZ: `delete-assignment` on `team`
  - Same campaign-team validation
  - Calls `assignment_service.bulk_delete_by_intent(...)`
  - Sends notifications

### Phase 8 — Update ScheduleActionToolbar

**File to modify:** `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx`

- Pass `selectionIntent` (the new shape) instead of just `selectionState`
- Update count display: for implicit selection, show "all assignments in campaign" or "N rows in campaign" instead of a specific count
- Show warning/indicator when in implicit campaign mode so user understands the scope

---

## Relevant Files

- `frontend/src/types/scheduleSelection.ts` — Add `ExplicitSelection`, `ImplicitSelection`, update `ScheduleSelectionState`
- `frontend/src/components/schedule/schedule-tab.tsx` — Update all selection + bulk handlers
- `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx` — Update count display + props
- `frontend/src/app/lib/api/assignmentApi.ts` — Add `bulkUpdateByIntent`, `bulkDeleteByIntent`
- `frontend/src/hooks/useAssignment.ts` — Add `useBulkUpdateByIntent`, `useBulkDeleteByIntent`
- `backend/shared/src/shared/schemas/dto/assignment.py` — Add `SelectionIntentDTO`, `BulkIntentUpdateDTO`, `BulkIntentDeleteDTO`
- `backend/api_gateway/src/routes/assignment_routes.py` — Add two new endpoints
- `backend/api_gateway/src/services/assignment_service.py` — Add `bulk_update_by_intent`, `bulk_delete_by_intent`
- `backend/shared/src/shared/database/repositories/assignment.py` — Possibly add `get_assignments_by_intent_query()` helper

---

## Step-by-Step (with dependencies)

### Phase A — Types & Contracts (no deps, can start immediately)
1. Update `ScheduleSelectionState` types in `frontend/src/types/scheduleSelection.ts`
2. Add `SelectionIntentDTO`, `BulkIntentUpdateDTO`, `BulkIntentDeleteDTO` to backend shared DTO
3. Add `SelectionIntentPayload` TypeScript type in frontend

### Phase B — Backend (depends on Phase A step 2)
4. Add `bulk_update_by_intent` and `bulk_delete_by_intent` to `assignment_service.py`
5. Add the two new API routes to `assignment_routes.py`

### Phase C — Frontend API Layer (depends on Phase A step 3)
6. Add `bulkUpdateByIntent`, `bulkDeleteByIntent` to `assignmentApi.ts`
7. Add `useBulkUpdateByIntent`, `useBulkDeleteByIntent` hooks to `useAssignment.ts`

### Phase D — Frontend State Logic (depends on Phase A step 1, parallel with B+C)
8. Add `isAssignmentSelected()` helper function
9. Update `handleRowSelect`, `handleSelectAll`, `handleColumnSelect` in `schedule-tab.tsx`
10. Update `handleScopeChange` and `handleToggleSelectionMode`
11. Update `handleBulkUpdateAssignments`, `handleBulkToggleFixed`, `handleBulkDeleteAssignments` to branch on intent type (depends on C)
12. Wire assignment cell checkbox rendering to use `isAssignmentSelected()`

### Phase E — UI (depends on Phase D)
13. Update `ScheduleActionToolbar` props + count display for implicit mode

---

## Verification

1. **Backend unit tests:** `cd backend && just all api_service` — add test cases for `bulk_update_by_intent` and `bulk_delete_by_intent` with campaign assignments outside the loaded window
2. **Frontend unit tests:** `cd frontend && just all` — test `isAssignmentSelected()` with both intent types
3. **Manual scenario testing:**
   - Scenario A: View March, campaign Sept–Dec, select all in campaign scope, bulk delete → verify Sept–Dec assignments deleted
   - Scenario B: View March, campaign Sept–Dec, select row A in campaign scope, navigate to Oct, verify row A assignments are checked
   - Scenario C: View March, campaign Sept–Dec, select all in campaign scope, navigate to Oct, uncheck one assignment, bulk delete → verify that assignment is NOT deleted but all others are

---

## Decisions

- **Create operations excluded from intent-based approach**: `bulk create` always requires explicit cells (user must pick dates + entity). This is intentional — you can't create assignments for unloaded dates without specifying them explicitly.
- **View scope stays explicit**: Since view scope is always within the 3-month loaded buffer, no change needed there.
- **No new MongoDB query method needed**: The existing `get_assignments()` / `get_assignments_by_schedule_id()` methods in the repository are sufficient; the service layer builds the appropriate filter.
- **Campaign-team validation**: The new endpoints must verify that the `campaign_id` in the intent belongs to the `team_id` in the URL before executing — prevents cross-team data leakage (OWASP: Broken Object Level Authorization).

## Further Considerations

1. **`toggleFixed` in implicit mode**: The current `handleBulkToggleFixed` toggles each assignment's current `fixed` value individually (some ON → OFF, some OFF → ON). In implicit mode with unloaded assignments, we can't know each assignment's current `fixed` state. Recommendation: **force all to a specific value** (`fixed=true`) rather than toggle, and add a separate "unfix all" action — OR restrict toggleFixed to explicit mode only. Needs decision.

2. **Notification volume**: `bulk_update_by_intent` could affect hundreds of assignments. The current `notify_assignment_crud()` sends one notification per assignment. May want to cap or batch notifications for intent-based operations. Out of scope for this refactor but worth noting.

3. **`selectedRowIds` semantics**: In shift view, `selectedRowIds` holds shift IDs; in worker view, they hold worker IDs. The DTO and service need to handle both. Plan uses both `selected_row_worker_ids` and `selected_row_shift_ids` fields, only one populated at a time based on `groupBy`.
