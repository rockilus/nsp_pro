from datetime import date, datetime, timezone
from typing import List

import pytest

from shared.augment.r_to_r_augmented import requests_to_requests_augmented
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
    FulfillmentStatus,
    Request,
    RequestStatus,
    RequestType,
    Schedule,
    Shift,
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    Staffing,
    SWOIdTypes,
    Worker,
    ObjectiveCategory,
    EngineInputsAugmented,
)

from engine import Outputs
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs


def _make_request(worker: Worker, shift: Shift, schedule: Schedule) -> Request:
    return Request(
        id="req_test",
        team_id="t0",
        worker_id=worker.id,
        start_date=schedule.start_date,
        end_date=schedule.start_date,
        shift_id=shift.id,
        shift_options=[
            ShiftWorkerOption(
                name=shift.name,
                id=shift.id,
                id_type=SWOIdTypes.SHIFT,
                is_bool_dim=False,
                category_name=shift.acronym,
            )
        ],
        negative=False,
        hard=True,
        status=RequestStatus.APPROVED,
        request_type=RequestType.WORK_DEMAND,
        fulfillment=FulfillmentStatus.NOT_PROCESSED,
        comment="",
        created_at=datetime.now(tz=timezone.utc),
    )


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

    def test_filter_out_shift_request_not_respected(self, ei_filters) -> None:
        # Create a shared dimension where only the shift has an entry -> shift filtered out
        ei = ei_filters
        dim = Dimension(
            id="dim_shift_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de = DimEntry(
            id="de_shift", dimension_id=dim.id, name="x", deleted=False
        )
        attr_shift = Attribute(
            id="a_s",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=ei.shifts[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de]
        ei.attributes = [attr_shift]

        target_worker = ei.workers[0]
        target_shift = ei.shifts[0]
        req = _make_request(target_worker, target_shift, ei.schedule)

        ei.requests_work = requests_to_requests_augmented(
            requests=[req],
            workers=ei.workers,
            shifts=ei.shifts,
            dimensions=ei.dimensions,
            dim_entries=ei.dim_entries,
            attributes=ei.attributes,
        )

        outputs = engine_solve_engine_inputs(ei)

        a_target = next(
            (
                a
                for a in outputs.assignments
                if a.worker_id == target_worker.id
                and a.date == ei.schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        assert a_target is None

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        # there should be a request breach for our request
        assert any(
            b.objective_category == ObjectiveCategory.REQUEST
            and b.objective_id == req.id
            for b in breaches
        )

    def test_filter_out_worker_request_not_respected(self, ei_filters) -> None:
        # Create a shared dimension where only the worker has an entry -> worker filtered out
        ei = ei_filters
        dim = Dimension(
            id="dim_worker_only",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="d2",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de = DimEntry(
            id="de_worker", dimension_id=dim.id, name="y", deleted=False
        )
        attr_worker = Attribute(
            id="a_w",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=ei.workers[0].id,
            dimension_id=dim.id,
            dim_entry_ids=[de.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de]
        ei.attributes = [attr_worker]

        target_worker = ei.workers[0]
        target_shift = ei.shifts[0]
        req = _make_request(target_worker, target_shift, ei.schedule)

        ei.requests_work = requests_to_requests_augmented(
            requests=[req],
            workers=ei.workers,
            shifts=ei.shifts,
            dimensions=ei.dimensions,
            dim_entries=ei.dim_entries,
            attributes=ei.attributes,
        )

        outputs = engine_solve_engine_inputs(ei)

        a_target = next(
            (
                a
                for a in outputs.assignments
                if a.worker_id == target_worker.id
                and a.date == ei.schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        assert a_target is None

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert any(
            b.objective_category == ObjectiveCategory.REQUEST
            and b.objective_id == req.id
            for b in breaches
        )

    def test_filter_in_but_other_dimension_filters_out_request(
        self, ei_filters
    ) -> None:
        # Two dimensions: first matches (worker+shift), second mismatches -> final result filtered
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

        target_worker = ei.workers[0]
        target_shift = ei.shifts[0]
        req = _make_request(target_worker, target_shift, ei.schedule)

        ei.requests_work = requests_to_requests_augmented(
            requests=[req],
            workers=ei.workers,
            shifts=ei.shifts,
            dimensions=ei.dimensions,
            dim_entries=ei.dim_entries,
            attributes=ei.attributes,
        )

        outputs = engine_solve_engine_inputs(ei)

        a_target = next(
            (
                a
                for a in outputs.assignments
                if a.worker_id == target_worker.id
                and a.date == ei.schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        # because dim_bad filters out the shift for our worker, the request is not satisfied
        assert a_target is None

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        assert any(
            b.objective_category == ObjectiveCategory.REQUEST
            and b.objective_id == req.id
            for b in breaches
        )

    def test_shift_filtered_out_all_workers_causes_coverage_breach(
        self, ei_filters
    ) -> None:
        # Make a shift demand for a specific shift/date and then filter out all workers for that shift
        ei = ei_filters
        # pick a normal/duty shift
        target_shift = next(
            s
            for s in ei.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        )

        # set a daily shift demand for the first campaign date
        dsd = ShiftDemandNew(
            date=ei.schedule.start_date,
            shift_id=target_shift.id,
            team_id="t0",
            count=1,
            notes=None,
            source=ShiftDemandSource.MANUAL,
            source_id=None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            id=f"dsd_{target_shift.id}_{ei.schedule.start_date.isoformat()}",
        )
        ei.shift_demands = [dsd]

        # create a dimension that marks the shift with a value that no worker has
        dim = Dimension(
            id="dim_filter_all",
            team_id="t0",
            dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
            name="filter_all",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
        de = DimEntry(
            id="de_only_shift", dimension_id=dim.id, name="only", deleted=False
        )
        attr_shift = Attribute(
            id="a_only_s",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=target_shift.id,
            dimension_id=dim.id,
            dim_entry_ids=[de.id],
        )

        ei.dimensions = [dim]
        ei.dim_entries = [de]
        ei.attributes = [attr_shift]

        outputs = engine_solve_engine_inputs(ei)

        # Ensure no assignment for that shift/date
        a_for_shift = [
            a
            for a in outputs.assignments
            if a.shift_id == target_shift.id
            and a.date == ei.schedule.start_date
        ]
        assert len(a_for_shift) == 0

        breaches = _parse_breaches_engine(ei.schedule, outputs.breaches)
        # there should be a daily shift demand breach for this shift/date
        assert any(
            b.objective_category == ObjectiveCategory.DAILY_SHIFT_DEMAND
            and b.variables[0].shift_id == target_shift.id
            for b in breaches
        )
