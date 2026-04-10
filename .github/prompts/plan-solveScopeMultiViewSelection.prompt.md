# Plan: SolveScope multi-view selection & solve_view field

## TL;DR
Remove the mutual-exclusivity validator between `worker_cells`/`shift_cells` in `SolveScope`, add a `solve_view: "worker" | "shift"` field that tells the backend which cells to use, split custom-solve cell storage into per-view arrays so switching views never wipes selections, and stop clearing only regular+custom-solve cells on view switch (bulk-ops selection still clears as before).

---

## Phase 1 — Schema changes (backend + frontend)

**Steps**
1. `backend/shared/src/shared/schemas/core/solve_task_status.py` — `SolveScope`:
   - Remove the `@model_validator(mode="after")` method `validate_cell_exclusion` entirely
   - Add field: `solve_view: Optional[Literal["worker", "shift"]] = None`
2. `frontend/src/types/solveTaskStatus.ts` — `SolveScope` interface:
   - Remove comment "Mutually exclusive with shift_cells" on `worker_cells` (and vice-versa)
   - Add field: `solve_view?: "worker" | "shift"`

---

## Phase 2 — Split selection storage in `useGenerationSelection`

**Steps** (depends on Phase 1 for the type)
3. `frontend/src/app/lib/hooks/useGenerationSelection.ts`:
   - Change `GenerationSelectionState` shape:
     ```ts
     { workerCells: SelectedScheduleCell[]; shiftCells: SelectedScheduleCell[]; scopeType: SolveScopeType; }
     ```
   - Update `DEFAULT_STATE` and `loadFromStorage` (legacy format: map old `cells` → `workerCells`, `shiftCells: []`)
   - Update `saveToStorage` for new shape
   - Change hook return signature to 6-tuple:
     `[workerCells, updateWorkerCells, shiftCells, updateShiftCells, scopeType, setScopeType]`
   - `clearGenerationSelection` — no change needed

---

## Phase 3 — Update `schedule-tab.tsx` (parallel with Phase 2)

**Steps** (depends on Phase 2)
4. Update `useGenerationSelection` destructuring:
   ```ts
   const [workerSolveCells, updateWorkerSolveCells, shiftSolveCells, updateShiftSolveCells, selectedSolveScope, setSelectedSolveScope] = useGenerationSelection(scheduleCampaign?.id ?? null);
   ```
5. Keep the existing `setSelectionState({ selectedCells: [] })` block on `groupBy` change (bulk-ops selection still clears — user confirmed).
   - Do NOT add any clearing of custom solve cells.
6. Update the four custom-solve handlers to route updates to the correct array based on current `groupBy`:
   - `handleCustomRowSelect`, `handleCustomColumnSelect`, `handleCustomCellSelect`, `handleCustomSelectAll`
   - Use `scheduleViewSettings.groupBy === "worker"` to branch between `updateWorkerSolveCells` / `updateShiftSolveCells`
7. Pass both arrays through the prop chain to `ScheduleNavBar`:
   - Replace `customSolveSelectedCells={customSolveSelectedCells}` with `workerSolveCells={workerSolveCells}` and `shiftSolveCells={shiftSolveCells}`

---

## Phase 4 — Prop chain update: `ScheduleNavBar` → `CampaignInfo`

**Steps** (depends on Phase 3)
8. `frontend/src/components/schedule/nav-bar/schedule-nav-bar.tsx`:
   - Replace single `customSolveSelectedCells?: SelectedScheduleCell[]` prop with two: `workerSolveCells?: SelectedScheduleCell[]`, `shiftSolveCells?: SelectedScheduleCell[]`
   - Forward both to `CampaignInfo`
9. `frontend/src/components/schedule/nav-bar/campaign-info.tsx`:
   - Same prop replacement; forward both to `CustomSolveDialog`
   - Remove old `customSolveSelectedCells` references

---

## Phase 5 — Update `CustomSolveDialog`

**Steps** (depends on Phase 4)
10. `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx`:
    - Replace `customSolveSelectedCells: SelectedScheduleCell[]` prop with `workerSolveCells: SelectedScheduleCell[]` and `shiftSolveCells: SelectedScheduleCell[]`
    - In `selectedEntities` useMemo: use `groupBy === "worker" ? workerSolveCells : shiftSolveCells` as the source of cells to display
    - In `handleConfirm`: build `SolveScope` from the ACTIVE view's cells only, and set `solve_view = groupBy`
      - e.g. `solve_view = groupBy as "worker" | "shift"`
      - Worker view: populate `worker_ids`/`worker_cells` (from `workerSolveCells`)
      - Shift view: populate `shift_ids`/`shift_cells` (from `shiftSolveCells`)
    - `isEmpty` check uses the currently-active view's cells

---

## Relevant files

- `backend/shared/src/shared/schemas/core/solve_task_status.py` — SolveScope model, validator, new field
- `frontend/src/types/solveTaskStatus.ts` — SolveScope interface, new field
- `frontend/src/app/lib/hooks/useGenerationSelection.ts` — split storage shape + return signature
- `frontend/src/components/schedule/schedule-tab.tsx` — hook destructuring, handlers routing, prop forwarding
- `frontend/src/components/schedule/nav-bar/schedule-nav-bar.tsx` — prop rename/split
- `frontend/src/components/schedule/nav-bar/campaign-info.tsx` — prop rename/split, pass to dialog
- `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx` — use per-view arrays, build scope with solve_view

---

## Verification
1. TypeScript compile: `cd frontend && npx tsc --noEmit` — 0 errors
2. Manually test: enter custom solve mode in worker view, select cells, switch to shift view → worker cells still highlighted when switching back
3. Manually test: select cells in both views, open Custom Solve Dialog — shows only the current view's cells
4. Manually test: confirm dialog in worker mode → SolveScope has `solve_view="worker"`, `worker_cells` populated
5. Manually test: confirm dialog in shift mode → SolveScope has `solve_view="shift"`, `shift_cells` populated
6. Verify bulk-ops selection (toggle selection mode, select cells, switch views) → bulk selection IS cleared on switch

---

## Decisions
- Bulk-ops selection (`selectionState.selectedCells`) still clears on `groupBy` change — unchanged behavior
- `solve_view` semantics: backend uses only the fields matching the view (e.g., `solve_view="shift"` → only `shift_ids`/`shift_cells`/`dates` are relevant; worker fields are ignored even if populated)
- Legacy storage migration: old `cells` array maps to `workerCells` (safe default)
- `CustomSolveDialog` displays only the current view's selection (only one array needed for the summary)
- Backend (`sqs_consumer.py` + `get_engine_inputs.py`) doesn't yet process `solve_scope`; no changes there — new field is additive and backward-compatible
