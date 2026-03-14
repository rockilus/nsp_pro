import pytest
from collections import Counter
from shared.schemas.core import (
    EngineInputsAugmented,
    ModelConfig,
    ObjectiveCategory,
    Penalties,
    ShiftType,
    ShiftRestType,
)
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.solve_task_status import (
    ShiftDateCell,
    SolveScope,
    SolveScopeType,
    WorkerDateCell,
)
from datetime import timedelta
import random

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
        assert outputs.is_solution is True

        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )

        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            assignments_count[key] -= demand.count
            assert (
                assignments_count[key] >= 0
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

        duty_shift_ids = {
            s.id for s in ei_scoped.shifts if s.shift_type == ShiftType.DUTY
        }

        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )

        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.shift_id in duty_shift_ids:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in full solve"
            else:
                assert (
                    assignments_count[key] == 0
                ), f"Unexpected assignment for non-duty shift {key} in DUTIES scope"

    # ------------------------------------------------------------------
    # T3 — NON_DUTIES scope assigns only normal shifts
    # ------------------------------------------------------------------
    def test_non_duties_scope_assigns_only_normal_shifts(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        scope = SolveScope(scope_type=SolveScopeType.NON_DUTIES)
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        non_duty_shift_ids = {
            s.id for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        }
        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.shift_id in non_duty_shift_ids:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in full solve"
            else:
                assert (
                    assignments_count[key] == 0
                ), f"Unexpected assignment for non-normal shift {key} in NON_DUTIES scope"

    # ------------------------------------------------------------------
    # T4a — CUSTOM shift view assigns only the selected shift
    # ------------------------------------------------------------------
    def test_custom_shift_view_shift_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_demand = next(
            d for d in ei_scoped.shift_demands if d.shift_id == test_shift.id
        )

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_ids=[test_shift.id],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.shift_id == test_shift.id:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom shift view solve"
            else:
                assert (
                    assignments_count[key] == 0
                ), f"Unexpected assignment for non-selected shift {key} in custom shift view solve"

    def test_custom_shift_view_date_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            dates=[test_date.isoformat()],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.date == test_date:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom date shift view solve"
            else:
                assert (
                    assignments_count[key] == 0
                ), f"Unexpected assignment for non-selected date {key} in custom date shift view solve"

    def test_custom_shift_view_shift_cell_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_demand = next(
            d for d in ei_scoped.shift_demands if d.shift_id == test_shift.id
        )

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_cells=[
                ShiftDateCell(
                    shift_id=test_shift.id,
                    date=test_demand.date.isoformat(),
                )
            ],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        assignments_count = Counter(
            (a.date, a.shift_id) for a in outputs.assignments
        )
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.id == test_demand.id:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom shift cell shift view solve"
            else:
                assert (
                    assignments_count[key] == 0
                ), f"Unexpected assignment for non-selected shift cell {key} in custom shift cell shift view solve"

    # ------------------------------------------------------------------
    # T4b — CUSTOM worker view assigns only the selected worker
    # ------------------------------------------------------------------
    def test_custom_worker_view_worker_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_ids=[test_worker.id],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        for a in outputs.assignments:
            if a.worker_id == test_worker.id:
                continue
            else:
                assert (
                    False
                ), f"Unexpected assignment for non-selected worker {a.worker_id} in custom worker view solve"

    def test_custom_worker_view_date_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            dates=[test_date.isoformat()],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        for a in outputs.assignments:
            if a.date == test_date:
                continue
            else:
                assert (
                    False
                ), f"Unexpected assignment for non-selected worker/date {a.worker_id} on {a.date} in custom worker/date view solve"

    def test_custom_worker_view_worker_cell_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(
                    worker_id=test_worker.id, date=test_date.isoformat()
                )
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        for a in outputs.assignments:
            if a.worker_id == test_worker.id and a.date == test_date:
                continue
            else:
                assert (
                    False
                ), f"Unexpected assignment for non-selected worker/date {a.worker_id} on {a.date} in custom worker cell view solve"

    # ------------------------------------------------------------------
    # T5 — out-of-scope WIP assignments are preserved as fixed (not deleted)
    # ------------------------------------------------------------------
    def test_duties_scope_out_of_scope_campaign_assignments_are_preserved_not_deleted(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
        a_campaign_normal = Assignment(
            id="a_campaign_normal",
            team_id="t0",
            schedule_id="sch_s",
            worker_id=test_worker.id,
            date=test_date,
            shift_id=test_shift.id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )

        ei_scoped.as_campaign_not_fixed = [a_campaign_normal]

        scope = SolveScope(scope_type=SolveScopeType.DUTIES)
        output = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift.id
        ]
        assert (
            matching
        ), "Out-of-scope non-duty assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Out-of-scope non-duty assignment should be marked fixed in outputs"

    def test_non_duties_out_of_scope_campaign_assignments_are_preserved_not_deleted(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift_duty = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.DUTY
        )
        test_shift_recup = next(
            s
            for s in ei_scoped.shifts
            if s.rest_type == ShiftRestType.RECUPERATION
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
        as_campaign_duty = [
            Assignment(
                id="a_campaign_duty",
                team_id="t0",
                schedule_id="sch_s",
                worker_id=test_worker.id,
                date=test_date,
                shift_id=test_shift_duty.id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            ),
            Assignment(
                id="a_campaign_recup",
                team_id="t0",
                schedule_id="sch_s",
                worker_id=test_worker.id,
                date=test_date,
                shift_id=test_shift_recup.id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            ),
        ]

        ei_scoped.as_campaign_not_fixed = as_campaign_duty
        scope = SolveScope(scope_type=SolveScopeType.NON_DUTIES)
        output = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift_duty.id
        ]
        assert (
            matching
        ), "Out-of-scope duty assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Out-of-scope duty assignment should be marked fixed in outputs"

    def test_custom_shift_view_out_of_scope_campaign_assignments_are_preserved_not_deleted(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
        a_campaign_normal = Assignment(
            id="a_campaign_normal",
            team_id="t0",
            schedule_id="sch_s",
            worker_id=test_worker.id,
            date=test_date,
            shift_id=test_shift.id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        ei_scoped.as_campaign_not_fixed = [a_campaign_normal]
        ei_scoped.as_campaign_not_fixed = [a_campaign_normal]
        # Choose another normal shift (not the test_shift) and a date
        # different from test_date so the campaign assignment is out-of-scope
        other_shift = next(
            s
            for s in ei_scoped.shifts
            if s.shift_type == ShiftType.NORMAL and s.id != test_shift.id
        )
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        # pick a date within campaign that is not test_date
        candidate_date = ei_scoped.schedule.start_date
        if candidate_date == test_date and days_range > 0:
            candidate_date = ei_scoped.schedule.start_date + timedelta(days=1)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_cells=[
                ShiftDateCell(
                    shift_id=other_shift.id, date=candidate_date.isoformat()
                )
            ],
            solve_view="shift",
        )

        output = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift.id
        ]
        assert (
            matching
        ), "Out-of-scope non-duty assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Out-of-scope non-duty assignment should be marked fixed in outputs"

    def test_custom_worker_view_out_of_scope_campaign_assignments_are_preserved_not_deleted(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        other_worker = next(
            w for w in ei_scoped.workers if w.id != test_worker.id
        )
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
        a_campaign_normal = Assignment(
            id="a_campaign_normal",
            team_id="t0",
            schedule_id="sch_s",
            worker_id=test_worker.id,
            date=test_date,
            shift_id=test_shift.id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        ei_scoped.as_campaign_not_fixed = [a_campaign_normal]
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(
                    worker_id=other_worker.id, date=test_date.isoformat()
                )
            ],
            solve_view="worker",
        )
        output = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift.id
        ]
        assert (
            matching
        ), "Out-of-scope non-duty assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Out-of-scope non-duty assignment should be marked fixed in outputs"

    # ------------------------------------------------------------------
    # T6 — pre-existing fixed assignments are honoured by an in-scope solve
    # ------------------------------------------------------------------
    def test_fixed_assignments_unchanged_by_in_scope_solve(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
        a_fixed = Assignment(
            id="a_fixed",
            team_id="t0",
            schedule_id="sch_s",
            worker_id=test_worker.id,
            date=test_date,
            shift_id=test_shift.id,
            fixed=True,
            source=AssignmentSource.MANUAL,
        )
        ei_scoped.as_campaign_fixed = [a_fixed]
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_ids=[test_shift.id],
            solve_view="shift",
        )
        output = engine_solve_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift.id
        ]
        assert (
            matching
        ), "Pre-existing fixed assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Pre-existing fixed assignment should be unchanged in outputs"

    # ------------------------------------------------------------------
    # T7 — CUSTOM shift cell with no demand produces no assignment
    # ------------------------------------------------------------------
    def test_custom_shift_cell_with_no_demand_produces_no_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        days_range = (
            ei_scoped.schedule.end_date - ei_scoped.schedule.start_date
        ).days
        test_date = next(
            d
            for d in campaign_dates
            if not next(
                (
                    d2
                    for d2 in ei_scoped.shift_demands
                    if d2.date == d and d2.shift_id == test_shift.id
                ),
                None,
            )
        )
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

    # # ------------------------------------------------------------------
    # # T8a — worker cell with unfulfilled demand creates an assignment
    # # ------------------------------------------------------------------
    # def test_worker_cell_with_unfulfilled_demand_creates_assignment(
    #     self, ei_scoped: EngineInputsAugmented
    # ) -> None:
    #     monday = first_monday(ei_scoped.schedule.start_date)
    #     ei_scoped.as_campaign_fixed = []
    #     scope = SolveScope(
    #         scope_type=SolveScopeType.CUSTOM,
    #         worker_cells=[
    #             WorkerDateCell(worker_id="w0", date=monday.isoformat())
    #         ],
    #         solve_view="worker",
    #     )
    #     outputs = engine_solve_engine_inputs(
    #         engine_inputs=ei_scoped, solve_scope=scope
    #     )

    #     w0_monday = [
    #         a
    #         for a in outputs.assignments
    #         if a.worker_id == "w0" and a.date == monday
    #     ]
    #     assert (
    #         w0_monday
    #     ), f"Expected at least one assignment for w0 on {monday}, got none"

    # # ------------------------------------------------------------------
    # # T8b — worker cell assigns only the unfulfilled shift when one demand met
    # # ------------------------------------------------------------------
    # def test_worker_cell_assigns_only_unfulfilled_shift_when_one_demand_met(
    #     self, ei_scoped: EngineInputsAugmented
    # ) -> None:
    #     monday = first_monday(ei_scoped.schedule.start_date)
    #     # Morning demand already satisfied by w1 (out-of-scope fixed)
    #     ei_scoped.as_campaign_fixed = [
    #         Assignment(
    #             id="fix_w1_morning",
    #             team_id="t0",
    #             schedule_id="sch_s",
    #             worker_id="w1",
    #             date=monday,
    #             shift_id="s_morning",
    #             fixed=True,
    #             source=AssignmentSource.MANUAL,
    #         )
    #     ]
    #     scope = SolveScope(
    #         scope_type=SolveScopeType.CUSTOM,
    #         worker_cells=[
    #             WorkerDateCell(worker_id="w0", date=monday.isoformat())
    #         ],
    #         solve_view="worker",
    #     )
    #     outputs = engine_solve_engine_inputs(
    #         engine_inputs=ei_scoped, solve_scope=scope
    #     )

    #     w0_assignments = [
    #         a
    #         for a in outputs.assignments
    #         if a.worker_id == "w0" and a.date == monday
    #     ]
    #     shift_ids = {a.shift_id for a in w0_assignments}
    #     assert (
    #         "s_afternoon" in shift_ids
    #     ), "w0 should be assigned s_afternoon (only remaining demand)"
    #     assert (
    #         "s_morning" not in shift_ids
    #     ), "w0 should NOT be assigned s_morning (demand already met)"

    # # ------------------------------------------------------------------
    # # T8c — worker cell with all demands met produces no assignment
    # # ------------------------------------------------------------------
    # def test_worker_cell_with_all_demands_met_produces_no_assignment(
    #     self, ei_scoped: EngineInputsAugmented
    # ) -> None:
    #     monday = first_monday(ei_scoped.schedule.start_date)
    #     ei_scoped.as_campaign_fixed = [
    #         Assignment(
    #             id="fix_w1_morning",
    #             team_id="t0",
    #             schedule_id="sch_s",
    #             worker_id="w1",
    #             date=monday,
    #             shift_id="s_morning",
    #             fixed=True,
    #             source=AssignmentSource.MANUAL,
    #         ),
    #         Assignment(
    #             id="fix_w2_afternoon",
    #             team_id="t0",
    #             schedule_id="sch_s",
    #             worker_id="w2",
    #             date=monday,
    #             shift_id="s_afternoon",
    #             fixed=True,
    #             source=AssignmentSource.MANUAL,
    #         ),
    #     ]
    #     scope = SolveScope(
    #         scope_type=SolveScopeType.CUSTOM,
    #         worker_cells=[
    #             WorkerDateCell(worker_id="w0", date=monday.isoformat())
    #         ],
    #         solve_view="worker",
    #     )
    #     outputs = engine_solve_engine_inputs(
    #         engine_inputs=ei_scoped, solve_scope=scope
    #     )

    #     w0_monday = [
    #         a
    #         for a in outputs.assignments
    #         if a.worker_id == "w0" and a.date == monday
    #     ]
    #     assert w0_monday == [], (
    #         f"Expected no assignment for w0 on {monday} (all demands met), got "
    #         + f"{w0_monday}"
    #     )
