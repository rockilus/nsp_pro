from datetime import date, timedelta
from typing import List

import pytest
from shared.schemas.core import EngineInputsAugmented, Shift, Worker

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_engine_shift_demands import (
    build_engine_shift_demands,
)
from engine import ShiftDemand as ShiftDemandEngine

# pylint: disable=unused-import
from tests.sample_data import sample_data_benoit_case_fixture  # noqa: F401
from tests.sample_data import test_data_set_1


class TestBuildEngineShiftDemands:
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_engine_shift_demands(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        workers = sample_data.workers
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        daily_shift_demands = sample_data.shift_demands
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        assert all(isinstance(sd, ShiftDemandEngine) for sd in shift_demands)

    # pylint: disable=R0801
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_workers(self, sample_data: EngineInputsAugmented) -> None:
        workers: List[Worker] = []
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        daily_shift_demands = sample_data.shift_demands
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in shift_demands:
            assert isinstance(sd, ShiftDemandEngine)
            assert sd.assignments == []
            assert sd.assignments_specialties == []

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_shifts(self, sample_data: EngineInputsAugmented) -> None:
        workers = sample_data.workers
        shifts: List[Shift] = []
        schedule = sample_data.schedule
        daily_shift_demands = sample_data.shift_demands
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts,
            daily_shift_demands,
            sample_data.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in shift_demands:
            assert isinstance(sd, ShiftDemandEngine)
            assert sd.assignments == []
            assert sd.assignments_specialties == []

    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_shift_demands_assignments(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        workers = sample_data.workers
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        daily_shift_demands = sample_data.shift_demands
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in shift_demands:
            assert isinstance(sd, ShiftDemandEngine)
            assert len(sd.assignments_specialties) == 0
            workers_not_deleted_ids = [w.id for w in workers_not_deleted]
            for w_id, date_str, shift_id in sd.assignments:
                sd_date = date.fromisoformat(date_str)
                assert any(
                    dsd.date == sd_date and dsd.shift_id == shift_id and dsd.count > 0
                    for dsd in daily_shift_demands
                )
                assert w_id in workers_not_deleted_ids
                dsds_source = [
                    dsd
                    for dsd in daily_shift_demands
                    if dsd.date == sd_date and dsd.shift_id == shift_id
                ]
                assert len(dsds_source) > 0
                shift_ref = next(
                    (s for s in shifts_not_deleted if s.id == shift_id), None
                )
                assert shift_ref is not None
                total_count = sum(dsd.count for dsd in dsds_source)
                staffing = sum(
                    s.staffing for s in shift_ref.staffing if s.specialty_id is None
                )
                assert sd.target == total_count * staffing

    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_shift_demands_assignments_specialty(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        workers = sample_data.workers
        workers[0].specialty_ids = ["spe1"]
        shifts = sample_data.shifts
        shifts[0].staffing[0].specialty_id = "spe1"
        schedule = sample_data.schedule
        daily_shift_demands = sample_data.shift_demands
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data.penalties.configuration_constraint.coverage,
        )

        sds_specialty = [sd for sd in shift_demands if sd.assignments_specialties]

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in sds_specialty:
            assert isinstance(sd, ShiftDemandEngine)
            assert len(sd.assignments_specialties) > 0
            w_spe1_id = workers[0].id
            for assignments_specialty, target_specialty in zip(
                sd.assignments_specialties, sd.target_specialties
            ):
                for (
                    w_id,
                    date_str,
                    shift_id,
                    specialty_id,
                ) in assignments_specialty:
                    sd_date = date.fromisoformat(date_str)
                    assert any(
                        dsd.date == sd_date
                        and dsd.shift_id == shift_id
                        and dsd.count > 0
                        for dsd in daily_shift_demands
                    )
                    assert w_id == w_spe1_id
                    assert specialty_id == "spe1"
                    dsds_source = [
                        dsd
                        for dsd in daily_shift_demands
                        if dsd.date == sd_date and dsd.shift_id == shift_id
                    ]
                    assert len(dsds_source) > 0
                    shift_ref = next(
                        (s for s in shifts_not_deleted if s.id == shift_id),
                        None,
                    )
                    assert shift_ref is not None
                    total_count = sum(dsd.count for dsd in dsds_source)
                    staffing = sum(
                        s.staffing
                        for s in shift_ref.staffing
                        if s.specialty_id == "spe1"
                    )
                    assert target_specialty == total_count * staffing

    # pylint: disable=redefined-outer-name
    def test_build_engine_shift_demands_fixture(
        self,
        sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        workers = sample_data_benoit_case_fixture.workers
        shifts = sample_data_benoit_case_fixture.shifts
        schedule = sample_data_benoit_case_fixture.schedule
        daily_shift_demands = sample_data_benoit_case_fixture.shift_demands
        fixed_assignments = (
            sample_data_benoit_case_fixture.as_hist
            + sample_data_benoit_case_fixture.as_wip_fixed
        )

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data_benoit_case_fixture.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        assert all(isinstance(sd, ShiftDemandEngine) for sd in shift_demands)

    # pylint: disable=redefined-outer-name
    def test_shift_demands_assignments_fixture(
        self,
        sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        workers = sample_data_benoit_case_fixture.workers
        shifts = sample_data_benoit_case_fixture.shifts
        schedule = sample_data_benoit_case_fixture.schedule
        daily_shift_demands = sample_data_benoit_case_fixture.shift_demands
        fixed_assignments = (
            sample_data_benoit_case_fixture.as_hist
            + sample_data_benoit_case_fixture.as_wip_fixed
        )

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data_benoit_case_fixture.penalties.configuration_constraint.coverage,
        )

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in shift_demands:
            assert isinstance(sd, ShiftDemandEngine)
            workers_not_deleted_ids = [w.id for w in workers_not_deleted]
            for w_id, date_str, shift_id in sd.assignments:
                sd_date = date.fromisoformat(date_str)
                assert any(
                    dsd.date == sd_date and dsd.shift_id == shift_id and dsd.count > 0
                    for dsd in daily_shift_demands
                )
                assert w_id in workers_not_deleted_ids
                dsds_source = [
                    dsd
                    for dsd in daily_shift_demands
                    if dsd.date == sd_date and dsd.shift_id == shift_id
                ]
                assert len(dsds_source) > 0
                shift_ref = next(
                    (s for s in shifts_not_deleted if s.id == shift_id), None
                )
                assert shift_ref is not None
                total_count = sum(dsd.count for dsd in dsds_source)
                staffing = sum(s.staffing for s in shift_ref.staffing)
                assert sd.target == total_count * staffing

    # pylint: disable=redefined-outer-name
    def test_shift_demands_assignments_specialty_fixture(
        self,
        sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        workers = sample_data_benoit_case_fixture.workers
        shifts = sample_data_benoit_case_fixture.shifts
        schedule = sample_data_benoit_case_fixture.schedule
        daily_shift_demands = sample_data_benoit_case_fixture.shift_demands
        fixed_assignments = (
            sample_data_benoit_case_fixture.as_hist
            + sample_data_benoit_case_fixture.as_wip_fixed
        )

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        shift_demands = build_engine_shift_demands(
            workers_not_deleted,
            dates_campaign,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            daily_shift_demands,
            sample_data_benoit_case_fixture.penalties.configuration_constraint.coverage,
        )

        sds_specialty = [sd for sd in shift_demands if sd.assignments_specialties]

        # Verify the output
        assert isinstance(shift_demands, list)
        for sd in sds_specialty:
            assert isinstance(sd, ShiftDemandEngine)
            assert len(sd.assignments_specialties) > 0
            for assignments_specialty, target_specialty in zip(
                sd.assignments_specialties, sd.target_specialties
            ):
                for (
                    w_id,
                    date_str,
                    shift_id,
                    specialty_id,
                ) in assignments_specialty:
                    workers_qualified = [
                        w
                        for w in workers_not_deleted
                        if specialty_id in w.specialty_ids
                    ]
                    sd_date = date.fromisoformat(date_str)
                    assert any(
                        dsd.date == sd_date
                        and dsd.shift_id == shift_id
                        and dsd.count > 0
                        for dsd in daily_shift_demands
                    )
                    dsds_source = [
                        dsd
                        for dsd in daily_shift_demands
                        if dsd.date == sd_date and dsd.shift_id == shift_id
                    ]
                    assert len(dsds_source) > 0
                    shift_ref = next(
                        (s for s in shifts_not_deleted if s.id == shift_id),
                        None,
                    )
                    assert shift_ref is not None
                    total_count = sum(dsd.count for dsd in dsds_source)
                    staffing = sum(
                        s.staffing
                        for s in shift_ref.staffing
                        if s.specialty_id == specialty_id
                    )
                    assert target_specialty == total_count * staffing
                    assert w_id in [w.id for w in workers_qualified]
