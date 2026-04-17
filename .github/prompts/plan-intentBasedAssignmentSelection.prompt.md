# Plan: Intent-Based Selection for Campaign-Scope Bulk Operations

## TL;DR
Augment the current ID-list selection with an optional campaign intent component. The frontend tracks a *hybrid* selection state: explicit assignment IDs (and cells) as today, plus an optional implicit campaign component (row criteria + exclusions) that the backend resolves server-side. The existing bulk update/delete routes and DTOs are extended — **no new routes are added**. This fixes the campaign-scope gap where unloaded assignments are skipped while leaving the user-facing selection UX completely unchanged.

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

## Design Principles

- **User-facing selection UX is unchanged.** Campaign mode only defines how row-level and table-level selection gestures behave (they produce implicit intent instead of explicit IDs). Individual cell clicks, individual assignment checkboxes, and column-date clicks all continue to work exactly as before and can be combined freely with campaign-row intent.
- **No new routes.** The intent is additive — it extends the existing `PUT /assignments/bulk/teams/{team_id}` and `DELETE /assignments/bulk/teams/{team_id}` payloads with an optional `intent` field.
- **Mixed selection is valid and expected.** A single selection can simultaneously contain:
  - Implicit campaign intent (e.g., all of row A across the full campaign) with some exclusions
  - Explicit individual assignment IDs (e.g., one assignment on row B, one outside the campaign)
  - Explicit cells for create operations
  The backend merges both dimensions server-side before executing.
- **Campaign scope ≠ restriction.** Working in campaign scope does not prevent the user from also selecting things outside the campaign. It only changes how row and "select all" gestures are captured.

---

## Proposed Architecture: Hybrid Selection State

### Phase 1 — Frontend: New Selection State Types

**File to modify:** `frontend/src/types/scheduleSelection.ts`

Augment `ScheduleSelectionState` with an optional `campaignIntent` field alongside the existing explicit fields:

```typescript
export interface SelectedScheduleCell {
  rowId: string;
  date: string; // "YYYY-MM-DD"
  scheduleId: string | null;
}

export type SelectionScope = 'view' | 'campaign';

// Optional implicit component: captures "all of these rows over the full campaign"
export interface CampaignSelectionIntent {
  campaignId: string;
  selectedRowIds: string[];        // empty = all rows in campaign
  excludedAssignmentIds: string[]; // individual deselections from the implicit set
}

export interface ScheduleSelectionState {
  isActive: boolean;
  scope: SelectionScope;
  selectedAssignmentIds: string[];   // explicit individual assignments (always resolved IDs)
  selectedCells: SelectedScheduleCell[];
  campaignIntent?: CampaignSelectionIntent; // present only in campaign scope, when row/all gestures were used
}
```

**New helper:** `isAssignmentSelected(assignment: AssignmentT, state: ScheduleSelectionState): boolean`
- Always check `selectedAssignmentIds` first (explicit set).
- If `campaignIntent` is present: also return `true` if the assignment's `scheduleId === campaignIntent.campaignId` AND it's not in `excludedAssignmentIds` AND (`campaignIntent.selectedRowIds` is empty OR the assignment's `workerId`/`shiftId` is in `selectedRowIds`).
- This drives checkbox rendering across the schedule grid. It works correctly as new assignments load during navigation because it's purely derived from state.

### Phase 2 — Frontend: Update Selection Handlers in `schedule-tab.tsx`

**File to modify:** `frontend/src/components/schedule/schedule-tab.tsx`

**Campaign mode only changes row-level and table-level gestures.** Cell-level selection is unaffected.

Handlers to update:
- `handleRowSelect(rowId, scope)`:
  - `scope === 'view'`: unchanged — add/remove explicit assignment IDs from the loaded buffer.
  - `scope === 'campaign'`: set/clear `campaignIntent.selectedRowIds` for that rowId. Loaded assignments for that row in the current view window are also added to `selectedAssignmentIds` for immediate visual feedback (they get deduplicated server-side).
- `handleSelectAll(rowIds, scope)`:
  - `scope === 'view'`: unchanged — explicit IDs from the loaded buffer.
  - `scope === 'campaign'`: set `campaignIntent = { campaignId, selectedRowIds: [], excludedAssignmentIds: [] }` (empty `selectedRowIds` = all rows). Also add currently loaded assignment IDs to `selectedAssignmentIds` for visual feedback.
- `handleColumnSelect(date, rowIds, scope)`: unchanged for both scopes — always adds explicit cells (for create) and explicit IDs for assignments in the visible date column.
- `handleCellSelect(rowId, date, scheduleId)`: unchanged.
- `handleScopeChange(newScope)`: reset `campaignIntent` to `undefined` when switching scopes; clear `selectedAssignmentIds` and `selectedCells` as well.
- `handleToggleSelectionMode`: reset everything including `campaignIntent`.

**Individual deselect while `campaignIntent` is present:** When user unchecks a loaded assignment that falls under the implicit intent, add its ID to `campaignIntent.excludedAssignmentIds` AND remove it from `selectedAssignmentIds`.

### Phase 3 — Frontend: Update Bulk Action Handlers

**File to modify:** `frontend/src/components/schedule/schedule-tab.tsx`

No routing change. The handlers pass the full hybrid state to the API layer:
- `handleBulkCreateAssignments(entityId)`: unchanged — always uses explicit `selectedCells`.
- `handleBulkUpdateAssignments(entityId)`: pass `selectedAssignmentIds` + `campaignIntent` (if present) to `bulkUpdateAssignments`.
- `handleBulkToggleFixed()`: same — pass both. See "Further Considerations" for the fixed-toggle edge case.
- `handleBulkDeleteAssignments()`: pass `selectedAssignmentIds` + `campaignIntent` (if present) to `bulkDeleteAssignments`.

### Phase 4 — Frontend: Update API Methods

**File to modify:** `frontend/src/app/lib/api/assignmentApi.ts`

No new methods. Update signatures of existing bulk methods to accept the optional intent:

```typescript
// New TS type for the intent payload sent to the backend
export interface SelectionIntentPayload {
  campaignId: string;
  selectedRowWorkerIds: string[];  // empty = all workers; only one of worker/shift populated
  selectedRowShiftIds: string[];   // empty = all shifts
  excludedAssignmentIds: string[];
}

// Updated signatures:
static async bulkUpdateAssignments(
  apiClient: AuthenticatedApiClient,
  assignments: AssignmentT[],
  teamId: string,
  intent?: SelectionIntentPayload,  // NEW optional param
): Promise<AssignmentsRecurrencesResultT>

static async bulkDeleteAssignments(
  apiClient: AuthenticatedApiClient,
  assignmentIds: string[],
  teamId: string,
  intent?: SelectionIntentPayload,  // NEW optional param
): Promise<AssignmentsRecurrencesResultT>
```

The intent is serialized alongside the existing payload fields when present:
- `PUT /assignments/bulk/teams/{teamId}` body: `{ assignments: [...], intent?: {...} }`
- `DELETE /assignments/bulk/teams/{teamId}` body: `{ ids: [...], intent?: {...} }`

**File to modify:** `frontend/src/hooks/useAssignment.ts` — no new hooks needed; update `useBulkUpdateAssignments` and `useBulkDeleteAssignments` call sites to thread through the optional intent.

### Phase 5 — Backend Shared DTO

**File to modify:** `backend/shared/src/shared/schemas/dto/assignment.py`

Add only `SelectionIntentDTO` and extend the existing bulk DTOs with an optional `intent` field — **no new bulk DTOs**:

```python
from typing import List, Optional
from pydantic import BaseModel

class SelectionIntentDTO(BaseModel):
    campaign_id: str
    selected_row_worker_ids: List[str] = []  # empty = all workers in campaign
    selected_row_shift_ids: List[str] = []   # empty = all shifts in campaign; only one of worker/shift populated
    excluded_assignment_ids: List[str] = []

# Existing DTO — add optional intent field:
class BulkAssignmentUpdateDTO(BaseModel):
    assignments: List[AssignmentDTO]
    intent: Optional[SelectionIntentDTO] = None  # NEW

# Existing DTO — add optional intent field:
class BulkAssignmentDeleteDTO(BaseModel):
    ids: List[str]
    intent: Optional[SelectionIntentDTO] = None  # NEW
```

`BulkAssignmentCreateDTO` is unchanged — create always requires explicit cells.

### Phase 6 — Backend Service Layer

**File to modify:** `backend/api_gateway/src/services/assignment_service.py`

Augment existing `bulk_update_assignments` and `bulk_delete_assignments` to also resolve and apply the optional intent:

**`bulk_update_assignments(assignments, intent=None) -> AssignmentsRecurrencesResult`:**
1. Process explicit `assignments` list as today.
2. If `intent` is provided:
   - Build MongoDB query: `{ schedule: campaign_id, _id: { $nin: excluded_ids + already_processed_explicit_ids }, worker: { $in: worker_ids } (if non-empty) OR shift: { $in: shift_ids } (if non-empty) }`
   - Fetch matching assignments via `assignment_db.get_assignments(query)`
   - Apply the same update transformation (new worker, new shift, or fixed value) to each
   - Call `update_assignments(intent_resolved_list)` and merge results
3. Return merged `AssignmentsRecurrencesResult`.

**`bulk_delete_assignments(ids, intent=None) -> AssignmentsRecurrencesResult`:**
1. Process explicit `ids` as today.
2. If `intent` is provided:
   - Build query as above, excluding `ids` already deleted
   - Fetch matching assignment IDs, call `delete_assignments(intent_ids)`
   - Merge results
3. Return merged result.

**Note:** For `toggleFixed` with intent, the backend must **set all intent-resolved assignments to a fixed value** rather than toggle (since their current state is unknown for unloaded records). The frontend must communicate the desired target value (`true` or `false`) explicitly. See "Further Considerations".

### Phase 7 — Backend Routes

**File to modify:** `backend/api_gateway/src/routes/assignment_routes.py`

**No new routes.** Update the existing bulk endpoints to handle the extended DTOs:

- `PUT /assignments/bulk/teams/{team_id}` (`bulk_update_assignments`):
  - If `body.intent` is present: validate `body.intent.campaign_id` belongs to `team_id` before proceeding (OWASP BOLA prevention).
  - Pass `body.intent` through to `assignment_service.bulk_update_assignments`.
  - Notification logic unchanged (will fire for both explicit + intent-resolved assignments).

- `DELETE /assignments/bulk/teams/{team_id}` (`bulk_delete_assignments`):
  - Same campaign-team ownership validation when `body.intent` is present.
  - Pass `body.intent` through to `assignment_service.bulk_delete_assignments`.

### Phase 8 — Update ScheduleActionToolbar

**File to modify:** `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx`

- Update count display: when `campaignIntent` is present, show "N explicit + all of M row(s) in campaign" instead of a simple count (since total is unknown until the server resolves it).
- Optionally show an indicator that the operation will affect assignments outside the current view window.

---

## Relevant Files

- `frontend/src/types/scheduleSelection.ts` — Add `CampaignSelectionIntent`, augment `ScheduleSelectionState`
- `frontend/src/components/schedule/schedule-tab.tsx` — Update row/all selection handlers and bulk action handlers
- `frontend/src/components/schedule/toolbar/ScheduleActionToolbar.tsx` — Update count display
- `frontend/src/app/lib/api/assignmentApi.ts` — Add optional `intent` param to `bulkUpdateAssignments`, `bulkDeleteAssignments`
- `frontend/src/hooks/useAssignment.ts` — Thread intent through existing hooks
- `backend/shared/src/shared/schemas/dto/assignment.py` — Add `SelectionIntentDTO`; extend `BulkAssignmentUpdateDTO` and `BulkAssignmentDeleteDTO`
- `backend/api_gateway/src/routes/assignment_routes.py` — Add intent campaign-team ownership validation to existing bulk routes
- `backend/api_gateway/src/services/assignment_service.py` — Augment `bulk_update_assignments` and `bulk_delete_assignments` to resolve intent

---

## Step-by-Step (with dependencies)

### Phase A — Types & Contracts (no deps, can start immediately)
1. Add `CampaignSelectionIntent`, update `ScheduleSelectionState` in `frontend/src/types/scheduleSelection.ts`
2. Add `SelectionIntentDTO` to backend shared DTO; add optional `intent` field to `BulkAssignmentUpdateDTO` and `BulkAssignmentDeleteDTO`
3. Add `SelectionIntentPayload` TypeScript type and update `bulkUpdateAssignments`/`bulkDeleteAssignments` signatures in `assignmentApi.ts`

### Phase B — Backend (depends on Phase A step 2)
4. Augment `bulk_update_assignments` and `bulk_delete_assignments` in `assignment_service.py` to resolve and process intent
5. Add campaign-team ownership validation to existing bulk routes in `assignment_routes.py`

### Phase C — Frontend API Layer (depends on Phase A step 3)
6. Update `bulkUpdateAssignments`, `bulkDeleteAssignments` in `assignmentApi.ts` to serialize and send `intent` when present
7. Thread intent through `useBulkUpdateAssignments` and `useBulkDeleteAssignments` in `useAssignment.ts`

### Phase D — Frontend State Logic (depends on Phase A step 1, parallel with B+C)
8. Add `isAssignmentSelected()` helper function
9. Update `handleRowSelect` and `handleSelectAll` in `schedule-tab.tsx` to produce `campaignIntent` when scope is `campaign`
10. Update `handleScopeChange` and `handleToggleSelectionMode` to reset `campaignIntent`
11. Update `handleBulkUpdateAssignments`, `handleBulkToggleFixed`, `handleBulkDeleteAssignments` to pass `campaignIntent` to API (depends on C)
12. Wire assignment cell checkbox rendering to use `isAssignmentSelected()`

### Phase E — UI (depends on Phase D)
13. Update `ScheduleActionToolbar` count display for hybrid selection

---

## Verification

1. **Backend unit tests:** `cd backend && just all api_service` — add test cases covering: (a) intent-only, (b) explicit-only, (c) hybrid — for both update and delete
2. **Frontend unit tests:** `cd frontend && just all` — test `isAssignmentSelected()` with all combinations of explicit IDs, campaignIntent, and exclusions
3. **Manual scenario testing:**
   - Scenario A: View March, campaign Sept–Dec, select all in campaign scope, bulk delete → verify Sept–Dec assignments deleted
   - Scenario B: View March, campaign Sept–Dec, select row A in campaign scope, navigate to Oct, verify row A assignments are checked
   - Scenario C: View March, campaign Sept–Dec, select all in campaign scope, navigate to Oct, uncheck one assignment, bulk delete → verify that assignment is NOT deleted but all others are
   - Scenario D: View March, campaign Sept–Dec, select row A in campaign scope, also individually select one assignment on row B (not in campaign), bulk delete → verify both row A (full campaign) and the single row B assignment are deleted
   - Scenario E: Select a column date (explicit cells) while campaignIntent is active → create works on explicit cells only, delete/update apply to full hybrid selection

---

## Decisions

- **No new routes**: The existing `PUT /assignments/bulk/teams/{team_id}` and `DELETE /assignments/bulk/teams/{team_id}` routes handle both explicit and intent-based selections. The intent is an optional additive field.
- **No new bulk DTOs**: `BulkAssignmentUpdateDTO` and `BulkAssignmentDeleteDTO` are extended with `Optional[SelectionIntentDTO]`. Backward-compatible — omitting intent behaves exactly as today.
- **Create operations excluded from intent-based approach**: `bulk create` always requires explicit cells (user must pick dates + entity). This is intentional — you can't create assignments for unloaded dates without specifying them explicitly.
- **View scope stays explicit**: Since view scope is always within the 3-month loaded buffer, no change needed there. `campaignIntent` is always `undefined` in view scope.
- **Campaign scope does not restrict**: Working in campaign scope does not prevent selecting assignments or cells outside the campaign. It only changes how row-level and "select all" gestures capture intent.
- **No new MongoDB query method needed**: The existing `get_assignments()` / `get_assignments_by_schedule_id()` methods in the repository are sufficient; the service layer builds the appropriate filter.
- **Campaign-team validation**: The bulk routes must verify that `intent.campaign_id` belongs to `team_id` in the URL before executing — prevents cross-team data leakage (OWASP: Broken Object Level Authorization).

## Further Considerations

1. **`toggleFixed` with campaign intent**: The current `handleBulkToggleFixed` toggles each loaded assignment individually (ON → OFF, some OFF → ON). For intent-resolved assignments that are not loaded, the current state is unknown. **Resolution needed**: either (a) restrict toggleFixed to the explicit component only when intent is present, showing a warning; or (b) require the UI to send a target `fixed` value (`true`/`false`) explicitly rather than a toggle — meaning separate "Fix all" and "Unfix all" actions. This needs a product decision before implementation.

2. **Notification volume**: Bulk operations resolved from intent can affect hundreds of assignments. The current `notify_assignment_crud()` sends one notification per assignment. May want to cap or batch notifications for large intent-resolved sets. Out of scope for this refactor but worth noting.

3. **`selectedRowIds` semantics**: In shift view, `selectedRowIds` holds shift IDs; in worker view, they hold worker IDs. The `CampaignSelectionIntent` and `SelectionIntentDTO` both carry separate `selectedRowWorkerIds` / `selectedRowShiftIds` fields, with only one populated at a time based on the current `groupBy` setting.
