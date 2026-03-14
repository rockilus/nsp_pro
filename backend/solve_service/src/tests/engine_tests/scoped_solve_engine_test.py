import pytest
from shared.schemas.core import (
    EngineInputsAugmented,
    ModelConfig,
    ObjectiveCategory,
    Penalties,
)
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.solve_task_status import (
    ShiftDateCell,
    SolveScope,
    SolveScopeType,
    WorkerDateCell,
)

from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.engine_tests.scoped_solve_fixture import (
    build_ei_scoped,
    first_monday,
    first_saturday,
)


class TestScopedSolveEngine:
    @pytest.fixture
    def ei_scoped(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        return build_ei_scoped(penalties_fix, model_config_fix)

    # ------------------------------------------------------------------
    # T1 — full solve with no scope fulfils all shift demands
    # ------------------------------------------------------------------
    def test_full_solve_no_scope_fulfils_all_shift_demands(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        outputs = engine_solve_engine_inputs(ei_scoped)
        breaches = _parse_breaches_engine(ei_scoped.schedule, outputs.breaches)
        assert outputs.is_solution is True

        assignments_count = {}
        for a in outputs.assignments:
            key = (a.date.isoformat(), a.shift_id)
            assignments_count[key] = assignments_count.get(key, 0) + 1

        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            assert (
                key not in breaches
            ), f"Unfulfilled demand for {key} in full solve"

    # ------------------------------------------------------------------
    # T2 — DUTIES scope assigns only duty and recuperation shifts
    # ------------------------------------------------------------------
    def test_duties_scope_assigns_only_duty_and_recup_shifts(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        scope = SolveScope(scope_type=SolveScopeType.DUTIES)
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        allowed = {"s_duty", "s_recup"}
        for a in outputs.assignments:
            assert (
                a.shift_id in allowed
            ), f"Unexpected shift {a.shift_id} in DUTIES scope"

    # ------------------------------------------------------------------
    # T3 — NON_DUTIES scope assigns only normal shifts
    # ------------------------------------------------------------------
    def test_non_duties_scope_assigns_only_normal_shifts(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        scope = SolveScope(scope_type=SolveScopeType.NON_DUTIES)
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        allowed = {"s_morning", "s_afternoon"}
        for a in outputs.assignments:
            assert (
                a.shift_id in allowed
            ), f"Unexpected shift {a.shift_id} in NON_DUTIES scope"

    # ------------------------------------------------------------------
    # T4a — CUSTOM shift view assigns only the selected shift
    # ------------------------------------------------------------------
    def test_custom_shift_view_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_ids=["s_morning"],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        for a in outputs.assignments:
            assert (
                a.shift_id == "s_morning"
            ), f"Expected s_morning only, got {a.shift_id}"

    # ------------------------------------------------------------------
    # T4b — CUSTOM worker view assigns only the selected worker
    # ------------------------------------------------------------------
    def test_custom_worker_view_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_ids=["w0"],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        for a in outputs.assignments:
            assert a.worker_id == "w0", f"Expected w0 only, got {a.worker_id}"

    # ------------------------------------------------------------------
    # T5 — out-of-scope WIP assignments are preserved as fixed (not deleted)
    # ------------------------------------------------------------------
    def test_out_of_scope_wip_assignments_are_preserved_not_deleted(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        monday = first_monday(ei_scoped.schedule.start_date)
        wip_morning = [
            Assignment(
                id=f"wip_morning_{i}",
                team_id="t0",
                schedule_id="sch_s",
                worker_id=f"w{i}",
                date=monday,
                shift_id="s_morning",
                fixed=False,
                source=AssignmentSource.SOLVER,
            )
            for i in range(3)
        ]
        scope = SolveScope(scope_type=SolveScopeType.DUTIES)
        engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)

        fixed_keys = {
            (a.worker_id, a.date, a.shift_id)
            for a in ei_scoped.as_campaign_fixed
        }
        for a in wip_morning:
            assert (
                a.worker_id,
                a.date,
                a.shift_id,
            ) in fixed_keys, (
                f"WIP assignment ({a.worker_id}, {a.date}, "
                + f"{a.shift_id}) was not preserved"
            )

    # ------------------------------------------------------------------
    # T6 — pre-existing fixed assignments are honoured by an in-scope solve
    # ------------------------------------------------------------------
    def test_fixed_assignments_unchanged_by_in_scope_solve(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        monday = first_monday(ei_scoped.schedule.start_date)
        fixed = Assignment(
            id="fix_w0_duty",
            team_id="t0",
            schedule_id="sch_s",
            worker_id="w0",
            date=monday,
            shift_id="s_duty",
            fixed=True,
            source=AssignmentSource.MANUAL,
        )
        ei_scoped.as_campaign_fixed = [fixed]
        scope = SolveScope(scope_type=SolveScopeType.DUTIES)
        outputs = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )

        matching = [
            a
            for a in outputs.assignments
            if a.worker_id == "w0"
            and a.date == monday
            and a.shift_id == "s_duty"
        ]
        assert (
            matching
        ), "Fixed assignment for (w0, monday, s_duty) should appear in outputs"

    # ------------------------------------------------------------------
    # T7 — CUSTOM shift cell with no demand produces no assignment
    # ------------------------------------------------------------------
    def test_custom_shift_cell_with_no_demand_produces_no_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        saturday = first_saturday(ei_scoped.schedule.start_date)
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_cells=[
                ShiftDateCell(shift_id="s_morning", date=saturday.isoformat())
            ],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )

        morning_saturday = [
            a
            for a in outputs.assignments
            if a.shift_id == "s_morning" and a.date == saturday
        ]
        assert morning_saturday == [], (
            f"Expected no s_morning assignment on Saturday {saturday}, got "
            + f"{morning_saturday}"
        )

    # ------------------------------------------------------------------
    # T8a — worker cell with unfulfilled demand creates an assignment
    # ------------------------------------------------------------------
    def test_worker_cell_with_unfulfilled_demand_creates_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        monday = first_monday(ei_scoped.schedule.start_date)
        ei_scoped.as_campaign_fixed = []
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id="w0", date=monday.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )

        w0_monday = [
            a
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date == monday
        ]
        assert (
            w0_monday
        ), f"Expected at least one assignment for w0 on {monday}, got none"

    # ------------------------------------------------------------------
    # T8b — worker cell assigns only the unfulfilled shift when one demand met
    # ------------------------------------------------------------------
    def test_worker_cell_assigns_only_unfulfilled_shift_when_one_demand_met(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        monday = first_monday(ei_scoped.schedule.start_date)
        # Morning demand already satisfied by w1 (out-of-scope fixed)
        ei_scoped.as_campaign_fixed = [
            Assignment(
                id="fix_w1_morning",
                team_id="t0",
                schedule_id="sch_s",
                worker_id="w1",
                date=monday,
                shift_id="s_morning",
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
        ]
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id="w0", date=monday.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )

        w0_assignments = [
            a
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date == monday
        ]
        shift_ids = {a.shift_id for a in w0_assignments}
        assert (
            "s_afternoon" in shift_ids
        ), "w0 should be assigned s_afternoon (only remaining demand)"
        assert (
            "s_morning" not in shift_ids
        ), "w0 should NOT be assigned s_morning (demand already met)"

    # ------------------------------------------------------------------
    # T8c — worker cell with all demands met produces no assignment
    # ------------------------------------------------------------------
    def test_worker_cell_with_all_demands_met_produces_no_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        monday = first_monday(ei_scoped.schedule.start_date)
        ei_scoped.as_campaign_fixed = [
            Assignment(
                id="fix_w1_morning",
                team_id="t0",
                schedule_id="sch_s",
                worker_id="w1",
                date=monday,
                shift_id="s_morning",
                fixed=True,
                source=AssignmentSource.MANUAL,
            ),
            Assignment(
                id="fix_w2_afternoon",
                team_id="t0",
                schedule_id="sch_s",
                worker_id="w2",
                date=monday,
                shift_id="s_afternoon",
                fixed=True,
                source=AssignmentSource.MANUAL,
            ),
        ]
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id="w0", date=monday.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )

        w0_monday = [
            a
            for a in outputs.assignments
            if a.worker_id == "w0" and a.date == monday
        ]
        assert w0_monday == [], (
            f"Expected no assignment for w0 on {monday} (all demands met), got "
            + f"{w0_monday}"
        )
