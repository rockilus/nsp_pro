import random
from collections import Counter
from datetime import timedelta

import pytest
from shared.schemas.core import (
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    ShiftRestType,
    ShiftType,
)
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.solve_task_status import (
    ShiftDateCell,
    SolveScope,
    SolveScopeType,
    WorkerDateCell,
)

from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.engine_tests.scoped_solve_fixture import build_ei_scoped

# pylint: disable=too-many-locals


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

        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)

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

        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)

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
        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.shift_id in non_duty_shift_ids:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in full solve"
            else:
                assert assignments_count[key] == 0, (
                    f"Unexpected assignment for non-normal shift {key} in "
                    + "NON_DUTIES scope"
                )

    # ------------------------------------------------------------------
    # T4a — CUSTOM shift view assigns only the selected shift
    # ------------------------------------------------------------------
    def test_custom_shift_view_shift_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_ids=[test_shift.id],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.shift_id == test_shift.id:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom shift view solve"
            else:
                assert assignments_count[key] == 0, (
                    f"Unexpected assignment for non-selected shift {key} in "
                    + "custom shift view solve"
                )

    def test_custom_shift_view_date_assigns_only_selected_shift(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            dates=[test_date.isoformat()],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.date == test_date:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom date shift view solve"
            else:
                assert assignments_count[key] == 0, (
                    f"Unexpected assignment for non-selected date {key} in "
                    + "custom date shift view solve"
                )

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
        assignments_count = Counter((a.date, a.shift_id) for a in outputs.assignments)
        for demand in ei_scoped.shift_demands:
            key = (demand.date, demand.shift_id)
            if demand.id == test_demand.id:
                assignments_count[key] -= demand.count
                assert (
                    assignments_count[key] >= 0
                ), f"Unfulfilled demand for {key} in custom shift cell shift view solve"
            else:
                assert assignments_count[key] == 0, (
                    "Unexpected assignment for non-selected shift cell "
                    + f"{key} in custom shift cell shift view solve"
                )

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
            assert False, (
                "Unexpected assignment for non-selected worker "
                + f"{a.worker_id} in custom worker view solve"
            )

    def test_custom_worker_view_date_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
            assert False, (
                "Unexpected assignment for non-selected worker/date "
                + f"{a.worker_id} on {a.date} in custom worker/date view solve"
            )

    def test_custom_worker_view_worker_cell_assigns_only_selected_worker(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id=test_worker.id, date=test_date.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        for a in outputs.assignments:
            if a.worker_id == test_worker.id and a.date == test_date:
                continue
            assert False, (
                "Unexpected assignment for non-selected worker/date "
                + f"{a.worker_id} on {a.date} in custom worker cell view solve"
            )

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
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
        output = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
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
            s for s in ei_scoped.shifts if s.rest_type == ShiftRestType.RECUPERATION
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
        output = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift_duty.id
        ]
        assert matching, "Out-of-scope duty assignment should be preserved in outputs"
        assert (
            len(matching) == 1
        ), "Out-of-scope duty assignment should be marked fixed in outputs"

    def test_custom_shift_view_out_of_scope_campaign_assignments_are_preserved(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        # pick a date within campaign that is not test_date
        candidate_date = ei_scoped.schedule.start_date
        if candidate_date == test_date and days_range > 0:
            candidate_date = ei_scoped.schedule.start_date + timedelta(days=1)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_cells=[
                ShiftDateCell(shift_id=other_shift.id, date=candidate_date.isoformat())
            ],
            solve_view="shift",
        )

        output = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
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

    def test_custom_worker_view_out_of_scope_campaign_assignments_are_preserved(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_shift = next(
            s for s in ei_scoped.shifts if s.shift_type == ShiftType.NORMAL
        )
        test_worker = next(w for w in ei_scoped.workers)
        other_worker = next(w for w in ei_scoped.workers if w.id != test_worker.id)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
                WorkerDateCell(worker_id=other_worker.id, date=test_date.isoformat())
            ],
            solve_view="worker",
        )
        output = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
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
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
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
        output = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert output.is_solution is True
        matching = [
            a
            for a in output.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_shift.id
        ]
        assert matching, "Pre-existing fixed assignment should be preserved in outputs"
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
        # Build campaign dates and pick a date that has no demand for the
        # selected shift
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        campaign_dates = [
            ei_scoped.schedule.start_date + timedelta(days=i)
            for i in range(days_range + 1)
        ]
        test_date = next(
            d
            for d in campaign_dates
            if not any(
                d2
                for d2 in ei_scoped.shift_demands
                if d2.date == d and d2.shift_id == test_shift.id
            )
        )

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            shift_cells=[
                ShiftDateCell(shift_id=test_shift.id, date=test_date.isoformat())
            ],
            solve_view="shift",
        )
        outputs = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True

        assignments_on_test_date = [
            a
            for a in outputs.assignments
            if a.shift_id == test_shift.id and a.date == test_date
        ]
        assert assignments_on_test_date == [], (
            f"Expected no {test_shift.id} assignment on {test_date}, got "
            + f"{assignments_on_test_date}"
        )

    # ------------------------------------------------------------------
    # T8a — worker cell with unfulfilled demand creates an assignment
    # ------------------------------------------------------------------
    def test_worker_cell_with_unfulfilled_demand_creates_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        test_demands = [
            d for d in ei_scoped.shift_demands if d.date == test_date and d.count > 0
        ]
        assert test_demands, f"No demands with count > 0 on {test_date}"

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id=test_worker.id, date=test_date.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True
        matching = [
            a
            for a in outputs.assignments
            if a.worker_id == test_worker.id and a.date == test_date
        ]
        assert (
            matching
        ), "Expected an assignment for worker cell with unfulfilled demand, got none"

    # ------------------------------------------------------------------
    # T8b — worker cell assigns only the unfulfilled shift when one demand met
    # ------------------------------------------------------------------
    def test_worker_cell_assigns_only_unfulfilled_shift_when_one_demand_met(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        # pick a random weekday (Mon-Fri) within the campaign range
        max_offset = max(0, days_range)
        for _ in range(10):
            offset = random.randint(0, max_offset)
            test_date = ei_scoped.schedule.start_date + timedelta(days=offset)
            if test_date.weekday() < 5:
                break
        else:
            # fallback: choose the first weekday in the range
            test_date = next(
                d
                for d in (
                    ei_scoped.schedule.start_date + timedelta(days=i)
                    for i in range(max_offset + 1)
                )
                if d.weekday() < 5
            )

        test_demands = [
            d for d in ei_scoped.shift_demands if d.date == test_date and d.count > 0
        ]
        assert (
            len(test_demands) >= 2
        ), f"Need at least 2 demands with count > 0 on {test_date}"

        test_demand_unfulfilled = test_demands[0]
        test_demands_fulfilled = [
            d for d in test_demands if d.id != test_demand_unfulfilled.id
        ]

        # Mark all but one demand as fulfilled by pre-assigning other workers
        other_workers = [w for w in ei_scoped.workers if w.id != test_worker.id]
        assert other_workers, "Need at least one other worker to pre-assign demands"
        for idx, demand in enumerate(test_demands_fulfilled):
            worker_to_assign = other_workers[idx % len(other_workers)]
            a_fixed = Assignment(
                id=f"a_fixed_{demand.shift_id}_{worker_to_assign.id}",
                team_id="t0",
                schedule_id="sch_s",
                worker_id=worker_to_assign.id,
                date=test_date,
                shift_id=demand.shift_id,
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
            ei_scoped.as_campaign_fixed.append(a_fixed)
            # If this demand is for a duty shift, also pre-assign a recuperation shift
            duty_shift = next(
                (s for s in ei_scoped.shifts if s.id == demand.shift_id),
                None,
            )
            if duty_shift and duty_shift.shift_type == ShiftType.DUTY:
                try:
                    recup_shift = next(
                        s
                        for s in ei_scoped.shifts
                        if s.rest_type == ShiftRestType.RECUPERATION
                    )
                except StopIteration:
                    recup_shift = None
                if recup_shift:
                    a_fixed_recup = Assignment(
                        id=f"a_fixed_{recup_shift.id}_{worker_to_assign.id}",
                        team_id="t0",
                        schedule_id="sch_s",
                        worker_id=worker_to_assign.id,
                        date=test_date,
                        shift_id=recup_shift.id,
                        fixed=True,
                        source=AssignmentSource.MANUAL,
                    )
                    ei_scoped.as_campaign_fixed.append(a_fixed_recup)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id=test_worker.id, date=test_date.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True

        matching = [
            a
            for a in outputs.assignments
            if a.worker_id == test_worker.id
            and a.date == test_date
            and a.shift_id == test_demand_unfulfilled.shift_id
        ]
        assert len(matching) == 1, (
            "Expected exactly 1 new assignment for worker cell with one "
            + f"unfulfilled demand, got {len(matching)-1}"
        )

    # ------------------------------------------------------------------
    # T8c — worker cell with all demands met produces no assignment
    # ------------------------------------------------------------------
    def test_worker_cell_with_all_demands_met_produces_no_assignment(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_worker = next(w for w in ei_scoped.workers)
        days_range = (ei_scoped.schedule.end_date - ei_scoped.schedule.start_date).days
        offset = random.randint(0, max(0, days_range))
        test_date = ei_scoped.schedule.start_date + timedelta(days=offset)

        test_demands = [
            d for d in ei_scoped.shift_demands if d.date == test_date and d.count > 0
        ]
        assert test_demands, f"No demands with count > 0 on {test_date}"

        # Mark all demands as fulfilled by pre-assigning other workers
        other_workers = [w for w in ei_scoped.workers if w.id != test_worker.id]
        assert other_workers, "Need at least one other worker to pre-assign demands"
        for idx, demand in enumerate(test_demands):
            worker_to_assign = other_workers[idx % len(other_workers)]
            a_fixed = Assignment(
                id=f"a_fixed_{demand.shift_id}_{worker_to_assign.id}",
                team_id="t0",
                schedule_id="sch_s",
                worker_id=worker_to_assign.id,
                date=test_date,
                shift_id=demand.shift_id,
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
            ei_scoped.as_campaign_fixed.append(a_fixed)
            # If this demand is for a duty shift, also pre-assign a recuperation shift
            duty_shift = next(
                (s for s in ei_scoped.shifts if s.id == demand.shift_id),
                None,
            )
            if duty_shift and duty_shift.shift_type == ShiftType.DUTY:
                try:
                    recup_shift = next(
                        s
                        for s in ei_scoped.shifts
                        if s.rest_type == ShiftRestType.RECUPERATION
                    )
                except StopIteration:
                    recup_shift = None
                if recup_shift:
                    a_fixed_recup = Assignment(
                        id=f"a_fixed_{recup_shift.id}_{worker_to_assign.id}",
                        team_id="t0",
                        schedule_id="sch_s",
                        worker_id=worker_to_assign.id,
                        date=test_date,
                        shift_id=recup_shift.id,
                        fixed=True,
                        source=AssignmentSource.MANUAL,
                    )
                    ei_scoped.as_campaign_fixed.append(a_fixed_recup)

        scope = SolveScope(
            scope_type=SolveScopeType.CUSTOM,
            worker_cells=[
                WorkerDateCell(worker_id=test_worker.id, date=test_date.isoformat())
            ],
            solve_view="worker",
        )
        outputs = engine_solve_engine_inputs(engine_inputs=ei_scoped, solve_scope=scope)
        assert outputs.is_solution is True

        matching = [
            a
            for a in outputs.assignments
            if a.worker_id == test_worker.id and a.date == test_date
        ]
        assert matching == [], (
            "Expected no assignments for worker cell with all demands met, "
            + f"got {matching}"
        )
