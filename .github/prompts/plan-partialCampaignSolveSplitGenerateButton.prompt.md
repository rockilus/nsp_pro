# Plan: Partial Campaign Solve — Split Generate Button

## TL;DR
Replace the single "Solve" button in `campaign-info.tsx` with a MUI split button (Button + dropdown arrow). Add 3 new solve modes — duties, non-duties, custom — alongside the existing full solve. Each mode passes a `SolveScope` object through the SQS message to the solve_service, which uses it to lock out-of-scope assignments as fixed before running the solver.

---

## Decisions
- **Partial strategy**: Lock unselected assignments as fixed (pass as `as_wip_fixed`), solver only re-optimises in-scope.
- **Duties split**: Based on `ShiftType.DUTY` (duties) vs `ShiftType.NORMAL` (non-duties).
- **Custom UX**:
  - Workers and shifts selected by selecting entire rows in the schedule table (existing selection mode), using a Sparkle icon (Lucide) in toolbar to trigger custom solve.
  - After clicking Sparkle / "Generate Custom", a confirmation dialog shows a summary of the selection; user confirms.
  - Date selection via calendar with individual date multi-select checkboxes (in the confirmation dialog).
- **Custom reuse**: NOT reusing existing selection mode wiring directly; custom selection uses a new trigger (sparkle icon) + confirmation dialog.
- **Custom date scope**: User selects workers/shifts via rows, then picks specific dates in confirmation dialog; if no dates selected, scope covers the entire campaign period.

---

## Architecture: SolveScope Object

### Shared DTO (backend/shared)
```python
class SolveScopeType(str, Enum):
    FULL = "FULL"
    DUTIES = "DUTIES"
    NON_DUTIES = "NON_DUTIES"
    CUSTOM = "CUSTOM"

class WorkerDateCell(BaseModel):
    worker_id: str
    date: str  # ISO "YYYY-MM-DD"

class ShiftDateCell(BaseModel):
    shift_id: str
    date: str  # ISO "YYYY-MM-DD"

class SolveScope(BaseModel):
    scope_type: SolveScopeType
    worker_ids: Optional[List[str]] = None          # CUSTOM: entire worker rows
    shift_ids: Optional[List[str]] = None           # CUSTOM: entire shift rows
    dates: Optional[List[str]] = None               # CUSTOM: entire date columns (ISO)
    worker_cells: Optional[List[WorkerDateCell]] = None  # CUSTOM: individual (worker, date) cells
    shift_cells: Optional[List[ShiftDateCell]] = None    # CUSTOM: individual (shift, date) cells
    # Invariant: worker_cells XOR shift_cells — enforced via @model_validator
```

**Cell mutual exclusion**: `worker_cells` and `shift_cells` cannot both be populated — the schedule table is in either worker-grouped or shift-grouped view, never both simultaneously. A Pydantic `@model_validator` raises if both are set.

### SQSSolveMessage extension
Add `solve_scope: Optional[SolveScope] = None` to `SQSSolveMessage`.

### Frontend SolveRequestT extension
```typescript
interface WorkerDateCell { worker_id: string; date: string; }
interface ShiftDateCell  { shift_id: string;  date: string; }

interface SolveScope {
  scope_type: "FULL" | "DUTIES" | "NON_DUTIES" | "CUSTOM";
  worker_ids?: string[];
  shift_ids?: string[];
  dates?: string[];
  worker_cells?: WorkerDateCell[];  // mutually exclusive with shift_cells
  shift_cells?: ShiftDateCell[];    // mutually exclusive with worker_cells
}
interface SolveRequestT {
  schedule_id: string;
  team_id: string;
  solve_scope?: SolveScope;
}
```

---

## Implementation Phases

### Phase 1 — Shared schemas (backend/shared)

1. Add `SolveScopeType`, `WorkerDateCell`, `ShiftDateCell`, and `SolveScope` Pydantic models to `backend/shared/src/shared/schemas/core/solve_task_status.py`. Include `@model_validator` to enforce `worker_cells` XOR `shift_cells`.
2. Add `solve_scope: Optional[SolveScope] = None` field to `SQSSolveMessage`.
3. Add `solve_scope` to `SolveRequest` (the API body schema).
4. Export new types from `backend/shared/src/shared/schemas/core/__init__.py`.

### Phase 2 — API Gateway (backend/api_gateway)

5. In `sqs_solve_routes.py`: `SolveRequest` body already carries `solve_scope` (via shared schema) — pass it through to `sqs_solve_service.submit_solve_request()`.
6. In `sqs_solve_service.py` (`APIGatewaySQSSolveService.submit_solve_request`): accept and forward `solve_scope` to the shared SQS service.
7. In `backend/shared/src/shared/services/sqs_solve_service.py`: accept `solve_scope` and include it in the `SQSSolveMessage` before sending.

### Phase 3 — Solve Service filtering (backend/solve_service)

8. In `sqs_consumer.py` (`_solve_schedule`): extract `solve_scope` from the message; pass it to `get_engine_inputs()`.
9. In `get_engine_inputs.py`: accept optional `solve_scope`; after building `EngineInputs`, call a new `apply_solve_scope()` function.
10. Create `backend/solve_service/src/db_operations/apply_solve_scope.py`:
    - **FULL**: no-op.
    - **DUTIES**: remove `ShiftType.NORMAL` shifts from `engine_inputs.shifts`; move all existing non-duty assignments to `as_wip_fixed` (locking them).
    - **NON_DUTIES**: remove `ShiftType.DUTY` and `ShiftType.REST.RECUPERATION` shifts from `engine_inputs.shifts`; lock existing duty assignments as fixed.
    - **CUSTOM**: Locking logic applied cumulatively — anything not in scope moves to `as_wip_fixed`:
      - `worker_ids`: lock assignments where `worker_id` NOT in list
      - `shift_ids`: lock assignments where `shift_id` NOT in list
      - `dates`: lock assignments where `date_iso` NOT in list
      - `worker_cells`: lock assignments where `(worker_id, date_iso)` NOT in the cell set — only those specific worker×date combos are free
      - `shift_cells`: lock assignments where `(shift_id, date_iso)` NOT in the cell set

### Phase 4 — Frontend types & API

11. In `frontend/src/types/solveTaskStatus.ts`: add `WorkerDateCell`, `ShiftDateCell`, `SolveScope` interfaces and extend `SolveRequestT` with `solve_scope?: SolveScope`.
12. In `frontend/src/app/lib/api/sqsSolveApi.ts`: verify `SolveRequestT` is passed as-is; `solve_scope` flows through automatically.
13. In `frontend/src/app/lib/contexts/SqsSolveContext.tsx`: update `startSolve` signature to accept `solveScope?: SolveScope` (replacing the unused `constraints?: string[]`). Pass it in the request body.

### Phase 5 — Split button UI (frontend)

14. In `frontend/src/components/schedule/nav-bar/campaign-info.tsx`:
    - Replace the single `<Button>` with a MUI split button pattern: `<ButtonGroup>` with the primary action button + `<Button>` with a dropdown arrow (`ArrowDropDownIcon`).
    - Primary button: "Generate" → triggers FULL solve (same as current).
    - Dropdown opens a `<Menu>` with 4 items:
      - "Generate Full Campaign" → `startSolve(…, { scope_type: "FULL" })`
      - "Generate Duties" → `startSolve(…, { scope_type: "DUTIES" })`
      - "Generate Non-Duties" → `startSolve(…, { scope_type: "NON_DUTIES" })`
      - "Generate Custom" (with Lucide `Sparkles` icon) → opens custom dialog
    - Keep cancel and retry polling buttons as-is.

### Phase 6 — Custom solve dialog (frontend)

15. Create `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx`:
    - Props: `open`, `onClose`, `onConfirm(scope: SolveScope)`, `workers: WorkerT[]`, `shifts: ShiftT[]`, `campaignStartDate`, `campaignEndDate`, `initialSelection?: ScheduleSelectionState`, `groupBy: "worker" | "shift"`.
    - Sections:
      - **Workers** (when `groupBy="worker"`): multi-select list (checkboxes); pre-populated from `initialSelection`.
      - **Shifts** (when `groupBy="shift"`): multi-select list (checkboxes); pre-populated from `initialSelection`.
      - **Dates**: calendar with individual date checkboxes (campaign period); default = all selected. Pre-populated if column selection was active.
    - On confirm:
      - If all distinct workers/shifts in `initialSelection` have fully-selected rows → produce `worker_ids` / `shift_ids`.
      - If `initialSelection` contains partial rows (specific dates per worker/shift) → produce `worker_cells` / `shift_cells`.
      - `worker_cells` and `shift_cells` are mutually exclusive (only one view is active).
    - A "none = all" convention: if everything is selected → corresponding field is `undefined`.
    - Confirm button sends the composed `SolveScope` back.

16. In `campaign-info.tsx`:
    - Add `customDialogOpen` state.
    - When "Generate Custom" is clicked → open `CustomSolveDialog`.
    - On confirm → call `startSolve(scheduleId, teamId, confirmedScope, onSqsSolveComplete)`.
    - Pass `workers` and `shifts` props from parent (available in `schedule-tab.tsx`).

### Phase 7 — Wire selection state into campaign-info (frontend)

17. In `schedule-tab.tsx`: pass `selectionState` down to `CampaignInfo` so it can pre-populate the custom dialog with the current row/column selection.
18. In `campaign-info.tsx`:
    - Accept optional `selectionState` prop.
    - When opening the custom dialog, pre-populate workers/shifts from `selectionState.selectedCells`.

---

## Relevant Files

- `backend/shared/src/shared/schemas/core/solve_task_status.py` — add SolveScope, extend SQSSolveMessage
- `backend/shared/src/shared/schemas/core/__init__.py` — export SolveScope, SolveScopeType, WorkerDateCell, ShiftDateCell
- `backend/shared/src/shared/services/sqs_solve_service.py` — forward solve_scope in message
- `backend/api_gateway/src/routes/sqs_solve_routes.py` — passes through via SolveRequest
- `backend/api_gateway/src/services/sqs_solve_service.py` — forward solve_scope
- `backend/solve_service/src/sqs_consumer.py` — extract and pass solve_scope
- `backend/solve_service/src/db_operations/get_engine_inputs.py` — apply scope after build
- `backend/solve_service/src/db_operations/apply_solve_scope.py` — NEW: filtering logic
- `frontend/src/types/solveTaskStatus.ts` — SolveScope + SolveRequestT extension
- `frontend/src/app/lib/contexts/SqsSolveContext.tsx` — update startSolve signature
- `frontend/src/app/lib/api/sqsSolveApi.ts` — passes SolveRequestT as body
- `frontend/src/components/schedule/nav-bar/campaign-info.tsx` — split button implementation
- `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx` — NEW: custom dialog
- `frontend/src/components/schedule/schedule-tab.tsx` — pass selectionState + workers/shifts to CampaignInfo

---

## Verification

1. Run backend shared tests: `cd backend && pytest` — confirm no DTO/schema import errors.
2. Run API gateway tests: `cd backend/api_gateway && pytest` — verify sqs_solve_routes accept solve_scope.
3. Run frontend TypeScript check: `cd frontend && npx tsc --noEmit` — verify no type errors.
4. Manual smoke test: start services via `docker-compose`, trigger each of the 4 solve modes and verify the correct scope is logged in solve_service.
5. Unit test `apply_solve_scope()`: write pytest cases for DUTIES (only NORMAL locked), NON_DUTIES (DUTY locked), CUSTOM (specific workers/shifts/dates/cells locked).

---

## Further Considerations
1. **Recuperation shifts in DUTIES/NON_DUTIES**: DUTY shifts generate linked RECUPERATION rest shifts. When solving duties-only, the recuperation logic in `core_to_engine_service` needs the duty shifts present; this should work since DUTY shifts remain in scope. For NON_DUTIES scope, recuperation shifts should be locked as fixed too (not re-optimised).
2. **i18n**: All new button labels ("Generate Full Campaign", "Generate Duties", etc.) need translation keys added to the `schedule-page` translation file for all supported languages.
3. **Selection mode conflict**: The custom dialog can pre-populate from the existing `selectionState`, but the user should also be able to freely edit the selection inside the dialog independent of table selection mode.
4. **Cell mutual exclusion UI enforcement**: The frontend must detect `scheduleViewSettings.groupBy` (worker vs shift view) before composing the `SolveScope` and only populate `worker_cells` or `shift_cells` — never both.
