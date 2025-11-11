from datetime import date, datetime

import pytest

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    DimEntry,
    Dimension,
    DimensionEntryType,
    DimensionType,
    ModelConfig,
    Penalties,
    ScheduleStatus,
    Schedule,
    Shift,
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    Worker,
    ObjectiveCategory,
    EngineInputsAugmented,
)

from engine import Outputs
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs


class TestWorkerShiftFiltersEngine:
    @pytest.fixture
    def ei_filters(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        # Minimal scenario built from scratch: one schedule date, two workers, two shifts
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime(2025, 1, 1),
            updated_at=datetime(2025, 1, 1),
        )

        workers = [
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2025, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=0,
                annual_leave=0,
                specialty_ids=[],
                deleted=False,
            )
            for i in range(2)
        ]

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Shift 0",
                acronym="S0",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 18, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s1",
                team_id="t0",
                name="Shift 1",
                acronym="S1",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 18, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="green",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]

        # create shift demands for both shifts on the campaign date so solver
        # has coverage requirements to satisfy (one slot each)
        shift_demands = [
            ShiftDemandNew(
                date=schedule.start_date,
                shift_id=s.id,
                team_id="t0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                id=f"dsd_{s.id}_{schedule.start_date.isoformat()}",
            )
            for s in shifts
        ]

        return EngineInputsAugmented(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_wip_fixed=[],
            cbs_augmented=[],
            shift_demands=shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=model_config_fix,
        )

    def test_solve_schedule_has_solution_and_no_breaches(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Solve the simple schedule and assert it's a valid solution with no breaches
        ei = ei_filters

        outputs: Outputs = engine_solve_engine_inputs(ei)

        assert outputs.is_solution is True
        assert outputs.objective_value == 0
        assert len(outputs.breaches) == 0

    def test_shift_filtered_out_by_dimension_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Create a shared dimension where the shift has one dim entry and
        # all workers have a different dim entry -> the shift is filtered out
        # for all workers which should produce a daily shift demand breach.
        ei = ei_filters
        dim = Dimension(
            id="dim_shift_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_filter = DimEntry(
            id="de_filter",
            dimension_id=dim.id,
            name="only_shift",
            deleted=False,
        )
        # attach the exclusive entry to the shift
        attr_shift = Attribute(
            id="a_s",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_filter.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de_filter]
        ei.attributes = [attr_shift]

        # run solver
        outputs = engine_solve_engine_inputs(ei)

        # solver should still have found a solution (with coverage penalty)
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert (
            breaches[0].objective_category
            == ObjectiveCategory.DAILY_SHIFT_DEMAND
        )

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen

    def test_worker_filtered_out_by_dimension_causes_shift_demand_breach(
        self, ei_filters
    ) -> None:
        # Create a shared dimension where workers have an entry that no
        # shift has -> all workers are filtered out for that shift.
        ei = ei_filters
        dim = Dimension(
            id="dim_worker_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d2",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_worker = DimEntry(
            id="de_worker",
            dimension_id=dim.id,
            name="only_worker",
            deleted=False,
        )
        # attach the exclusive entry to every worker so none match shifts
        attr_w0 = Attribute(
            id="a_w0",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_worker.id],
        )
        attr_w1 = Attribute(
            id="a_w1",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[1].id,
            dimension_id=dim.id,
            dim_entry_ids=[de_worker.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de_worker]
        ei.attributes = [attr_w0, attr_w1]

        outputs = engine_solve_engine_inputs(ei)

        # solver should find a solution but pay a coverage penalty
        assert outputs.is_solution is True

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == len(ei.shifts)  # one breach per shift
        assert (
            breaches[0].objective_category
            == ObjectiveCategory.DAILY_SHIFT_DEMAND
        )

        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen * len(ei.shifts)

    def test_filter_in_but_other_dimension_filters_out_causes_shift_demand_breach(
        self, ei_filters: EngineInputsAugmented
    ) -> None:
        # Two dimensions: first matches (worker+shift), second mismatches -> final result filtered
        # This should filter the shift for the worker and produce a daily shift demand breach
        ei = ei_filters
        dim_ok = Dimension(
            id="dim_ok",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="ok",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_ok = DimEntry(
            id="de_ok", dimension_id=dim_ok.id, name="ok", deleted=False
        )

        dim_bad = Dimension(
            id="dim_bad",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="bad",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de_bad = DimEntry(
            id="de_bad", dimension_id=dim_bad.id, name="bad", deleted=False
        )

        # worker has de_ok for dim_ok and no matching entry for dim_bad
        attr_w_ok = Attribute(
            id="a_w_ok",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[de_ok.id],
        )
        # shift has de_ok for dim_ok (match) and de_bad for dim_bad (mismatch)
        attr_s_ok = Attribute(
            id="a_s_ok",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_ok.id,
            dim_entry_ids=[de_ok.id],
        )
        attr_s_bad = Attribute(
            id="a_s_bad",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim_bad.id,
            dim_entry_ids=[de_bad.id],
        )

        ei.dimensions = [dim_ok, dim_bad]
        ei.dim_entries = [de_ok, de_bad]
        ei.attributes = [attr_w_ok, attr_s_ok, attr_s_bad]

        # run solver (no request is provided)
        outputs = engine_solve_engine_inputs(ei)

        # solver should find a solution but pay a coverage penalty
        assert outputs.is_solution is True

        # confirm there is a single daily shift demand breach
        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert len(breaches) == 1
        assert (
            breaches[0].objective_category
            == ObjectiveCategory.DAILY_SHIFT_DEMAND
        )

        # objective_value should equal the coverage penalty for a normal shift
        expected_pen = ei.penalties.configuration_constraint.coverage.normal
        assert outputs.objective_value == expected_pen
