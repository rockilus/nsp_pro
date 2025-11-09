from datetime import datetime, timezone
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
        shift_id=None,
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
    def test_no_filters_request_respected(
        self, engine_inputs: EngineInputsAugmented
    ) -> None:
        # No dimensions/attributes -> request should be satisfied
        ei = engine_inputs
        ei.dimensions = []
        ei.dim_entries = []
        ei.attributes = []

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

        outputs: Outputs = engine_solve_engine_inputs(ei)

        # check assignment exists for the requested triple
        a_target = next(
            (
                a
                for a in outputs.assignments
                if a.worker_id == req.worker_id
                and a.date == req.start_date
                and a.shift_id == req.shift_id
            ),
            None,
        )
        assert a_target is not None

        assert len(outputs.breaches) == 0
        assert outputs.objective_value == 0

    def test_filter_out_shift_request_not_respected(
        self, engine_inputs
    ) -> None:
        # Create a shared dimension where only the shift has an entry -> shift filtered out
        ei = engine_inputs
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

    def test_filter_out_worker_request_not_respected(
        self, engine_inputs
    ) -> None:
        # Create a shared dimension where only the worker has an entry -> worker filtered out
        ei = engine_inputs
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
        self, engine_inputs
    ) -> None:
        # Two dimensions: first matches (worker+shift), second mismatches -> final result filtered
        ei = engine_inputs
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
        self, engine_inputs
    ) -> None:
        # Make a shift demand for a specific shift/date and then filter out all workers for that shift
        ei = engine_inputs
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
