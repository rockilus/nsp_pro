# pylint: disable=too-many-lines
from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple

from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    Dimension,
    DimEntry,
    FulfillmentStatus,
    Request,
    RequestStatus,
    RequestType,
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
    WorkerDates,
)

from core_to_engine_service.build_engine_fixed_values import (
    _apply_leave_requests,
    _apply_negative_work_demand,
    _apply_single_shift_work_demand,
    _filter_campaign_dates,
    _initialize_historical_assignments,
    _zero_overlapping_shifts,
    _zero_shifts_without_demand,
    _zero_unrequested_leave_shifts,
    core_to_engine_fixed_values,
)
from core_to_engine_service.build_engine_variables import (
    build_engine_variables,
)
from core_to_engine_service.core_to_engine_inputs import (
    _build_shift_id_to_duration_dict,
)


# pylint: disable=R0801
class TestFilterCampaignDates:
    """Test _filter_campaign_dates helper function."""

    def test_filter_campaign_dates_basic(self) -> None:
        """Test basic filtering of request dates to campaign dates."""
        schedule_start = date(2025, 1, 1)
        schedule_end = date(2025, 1, 10)

        campaign_dates = [
            schedule_start + timedelta(days=i)
            for i in range((schedule_end - schedule_start).days + 1)
        ]

        worker_dates = WorkerDates(
            dates_hist=[],
            dates_campaign=campaign_dates,
        )

        worker_ids_to_worker_dates = {"w0": worker_dates}

        # Request spans entire campaign
        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w0",
            start_date=schedule_start,
            end_date=schedule_end,
            shift_id="s0",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        result = _filter_campaign_dates(request, worker_ids_to_worker_dates)

        assert len(result) == 10
        assert result == campaign_dates

    def test_filter_campaign_dates_partial_overlap(self) -> None:
        """Test filtering when request extends beyond campaign dates."""
        schedule_start = date(2025, 1, 5)
        schedule_end = date(2025, 1, 10)

        campaign_dates = [
            schedule_start + timedelta(days=i)
            for i in range((schedule_end - schedule_start).days + 1)
        ]

        worker_dates = WorkerDates(
            dates_hist=[],
            dates_campaign=campaign_dates,
        )

        worker_ids_to_worker_dates = {"w0": worker_dates}

        # Request starts before and ends after campaign
        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 15),
            shift_id="s0",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        result = _filter_campaign_dates(request, worker_ids_to_worker_dates)

        # Only dates from Jan 5-10 should be returned
        assert len(result) == 6
        assert result == campaign_dates

    def test_filter_campaign_dates_no_overlap(self) -> None:
        """Test filtering when request has no overlap with campaign."""
        campaign_dates = [date(2025, 2, 1) + timedelta(days=i) for i in range(5)]

        worker_dates = WorkerDates(
            dates_hist=[],
            dates_campaign=campaign_dates,
        )

        worker_ids_to_worker_dates = {"w0": worker_dates}

        # Request is entirely before campaign
        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            shift_id="s0",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        result = _filter_campaign_dates(request, worker_ids_to_worker_dates)

        assert len(result) == 0

    def test_filter_campaign_dates_worker_not_found(self) -> None:
        """Test filtering when worker is not in the mapping."""
        worker_ids_to_worker_dates: Dict[str, WorkerDates] = {}

        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w999",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 5),
            shift_id="s0",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        result = _filter_campaign_dates(request, worker_ids_to_worker_dates)

        assert len(result) == 0


class TestZeroOverlappingShifts:
    """Test _zero_overlapping_shifts helper function."""

    def test_zero_overlapping_shifts_basic(self) -> None:
        """Test zeroing out overlapping normal/duty shifts."""
        # Create shifts: one reference and two that overlap
        reference_shift = Shift(
            id="s_ref",
            team_id="t0",
            name="Reference Shift",
            acronym="REF",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        overlapping_normal = Shift(
            id="s_normal",
            team_id="t0",
            name="Normal Shift",
            acronym="NS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 7, 0),
            end_time=datetime(2025, 1, 1, 15, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="green",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        non_overlapping = Shift(
            id="s_other",
            team_id="t0",
            name="Other Shift",
            acronym="OS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 20, 0),
            end_time=datetime(2025, 1, 2, 4, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="purple",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [reference_shift, overlapping_normal, non_overlapping]

        # Initialize output dictionary
        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s_ref"): 1,
            ("w0", "2025-01-01", "s_normal"): 1,
            ("w0", "2025-01-01", "s_other"): 1,
        }

        _zero_overlapping_shifts(out, "w0", "2025-01-01", reference_shift, shifts)

        # Overlapping normal shift should be zeroed
        assert out[("w0", "2025-01-01", "s_normal")] == 0
        # Non-overlapping shift should remain 1
        assert out[("w0", "2025-01-01", "s_other")] == 1
        # Reference shift should remain 1
        assert out[("w0", "2025-01-01", "s_ref")] == 1

    def test_zero_overlapping_shifts_no_overlap(self) -> None:
        """Test when no shifts overlap."""
        reference_shift = Shift(
            id="s_ref",
            team_id="t0",
            name="Reference Shift",
            acronym="REF",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 12, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        non_overlapping = Shift(
            id="s_other",
            team_id="t0",
            name="Other Shift",
            acronym="OS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 20, 0),
            end_time=datetime(2025, 1, 2, 4, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="purple",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [reference_shift, non_overlapping]

        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s_ref"): 1,
            ("w0", "2025-01-01", "s_other"): 1,
        }

        _zero_overlapping_shifts(out, "w0", "2025-01-01", reference_shift, shifts)

        # All shifts should remain unchanged
        assert out[("w0", "2025-01-01", "s_other")] == 1
        assert out[("w0", "2025-01-01", "s_ref")] == 1


class TestInitializeHistoricalAssignments:
    """Test _initialize_historical_assignments function."""

    def test_initialize_empty_history(self) -> None:
        """Test initialization with no historical dates."""
        workers = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
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
        ]

        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=[], dates_campaign=[date(2025, 1, 1)])
        }

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Shift 0",
                acronym="S0",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 16, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            )
        ]

        assignments: List[Assignment] = []

        result = _initialize_historical_assignments(
            workers, worker_ids_to_worker_dates, shifts, assignments
        )

        # No historical dates means empty dictionary
        assert len(result) == 0

    def test_initialize_with_history_no_assignments(self) -> None:
        """Test initialization with historical dates but no assignments."""
        workers = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
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
        ]

        hist_dates = [date(2024, 12, 30), date(2024, 12, 31)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=hist_dates, dates_campaign=[date(2025, 1, 1)])
        }

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Shift 0",
                acronym="S0",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 16, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            )
        ]

        assignments: List[Assignment] = []

        result = _initialize_historical_assignments(
            workers, worker_ids_to_worker_dates, shifts, assignments
        )

        # Should have 2 dates * 1 shift = 2 entries, all set to 0
        assert len(result) == 2
        assert result[("w0", "2024-12-30", "s0")] == 0
        assert result[("w0", "2024-12-31", "s0")] == 0

    def test_initialize_with_assignments(self) -> None:
        """Test initialization with historical assignments."""
        workers = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
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
        ]

        hist_dates = [date(2024, 12, 30), date(2024, 12, 31)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=hist_dates, dates_campaign=[date(2025, 1, 1)])
        }

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Shift 0",
                acronym="S0",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 16, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            )
        ]

        assignments = [
            Assignment(
                id="a0",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                date=date(2024, 12, 30),
                shift_id="s0",
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
        ]

        result = _initialize_historical_assignments(
            workers, worker_ids_to_worker_dates, shifts, assignments
        )

        # Assignment on Dec 30 should be 1, Dec 31 should be 0
        assert len(result) == 2
        assert result[("w0", "2024-12-30", "s0")] == 1
        assert result[("w0", "2024-12-31", "s0")] == 0


class TestApplyLeaveRequests:
    """Test _apply_leave_requests function."""

    def test_apply_leave_request_basic(self) -> None:
        """Test applying a basic leave request."""
        # Create a leave shift
        leave_shift = Shift(
            id="s_leave",
            team_id="t0",
            name="Annual Leave",
            acronym="AL",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 1, 23, 59),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        # Create a normal shift that overlaps
        normal_shift = Shift(
            id="s_normal",
            team_id="t0",
            name="Day Shift",
            acronym="DS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [leave_shift, normal_shift]
        shift_dict = {s.id: s for s in shifts}

        # Create campaign dates
        campaign_dates = [date(2025, 1, 1), date(2025, 1, 2)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=[], dates_campaign=campaign_dates)
        }

        # Create approved leave request for Jan 1
        approved_requests = [
            Request(
                id="r0",
                team_id="t0",
                worker_id="w0",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 1, 1),
                shift_id="s_leave",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.UNFULFILLED,
                comment="",
                created_at=datetime.now(),
            )
        ]

        # Initialize output
        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s_leave"): 0,
            ("w0", "2025-01-01", "s_normal"): 1,
            ("w0", "2025-01-02", "s_leave"): 0,
            ("w0", "2025-01-02", "s_normal"): 1,
        }

        _apply_leave_requests(
            out,
            approved_requests,
            worker_ids_to_worker_dates,
            shift_dict,
            shifts,
        )

        # Leave shift should be set to 1 on Jan 1
        assert out[("w0", "2025-01-01", "s_leave")] == 1
        # Overlapping normal shift should be zeroed on Jan 1
        assert out[("w0", "2025-01-01", "s_normal")] == 0
        # Jan 2 should remain unchanged
        assert out[("w0", "2025-01-02", "s_leave")] == 0
        assert out[("w0", "2025-01-02", "s_normal")] == 1

    # pylint: disable=too-few-public-methods
    def test_apply_leave_request_invalid_shift(self) -> None:
        """Test that invalid shift_id is skipped."""
        campaign_dates = [date(2025, 1, 1)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=[], dates_campaign=campaign_dates)
        }

        # Request with invalid shift_id
        approved_requests = [
            Request(
                id="r0",
                team_id="t0",
                worker_id="w0",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 1, 1),
                shift_id="s_invalid",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.UNFULFILLED,
                comment="",
                created_at=datetime.now(),
            )
        ]

        out: Dict[Tuple[str, str, str], int] = {}
        shift_dict: Dict[str, Shift] = {}
        shifts: List[Shift] = []

        # Should not raise an error
        _apply_leave_requests(
            out,
            approved_requests,
            worker_ids_to_worker_dates,
            shift_dict,
            shifts,
        )

        # Dictionary should remain empty
        assert len(out) == 0


# pylint: disable=too-few-public-methods
class TestApplyWorkDemandRequests:
    """Test work demand request application functions."""

    def test_apply_negative_work_demand(self) -> None:
        """Test applying a negative work demand request."""
        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s0"): 1,
            ("w0", "2025-01-01", "s1"): 1,
        }

        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name="Shift 0",
                    id="s0",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="S0",
                )
            ],
            negative=True,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        target_shift_ids = ["s0"]
        dates_to_process = [date(2025, 1, 1)]

        _apply_negative_work_demand(out, request, target_shift_ids, dates_to_process)

        # s0 should be zeroed, s1 should remain
        assert out[("w0", "2025-01-01", "s0")] == 0
        assert out[("w0", "2025-01-01", "s1")] == 1

    def test_apply_single_shift_work_demand(self) -> None:
        """Test applying a single-shift positive work demand."""
        target_shift = Shift(
            id="s0",
            team_id="t0",
            name="Shift 0",
            acronym="S0",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        overlapping_shift = Shift(
            id="s1",
            team_id="t0",
            name="Shift 1",
            acronym="S1",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 7, 0),
            end_time=datetime(2025, 1, 1, 15, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="green",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [target_shift, overlapping_shift]

        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s0"): 0,
            ("w0", "2025-01-01", "s1"): 1,
        }

        request = Request(
            id="r0",
            team_id="t0",
            worker_id="w0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name="Shift 0",
                    id="s0",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="S0",
                )
            ],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.UNFULFILLED,
            comment="",
            created_at=datetime.now(),
        )

        dates_to_process = [date(2025, 1, 1)]

        _apply_single_shift_work_demand(
            out, request, target_shift, "s0", dates_to_process, shifts
        )

        # s0 should be set to 1
        assert out[("w0", "2025-01-01", "s0")] == 1
        # Overlapping s1 should be zeroed
        assert out[("w0", "2025-01-01", "s1")] == 0


# pylint: disable=too-few-public-methods
class TestZeroUnrequestedLeaveShifts:
    """Test _zero_unrequested_leave_shifts function."""

    # pylint: disable=too-few-public-methods
    def test_zero_unrequested_leave_shifts(self) -> None:
        """Test zeroing leave shifts when no request exists."""
        workers_not_deleted = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
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
        ]

        campaign_dates = [date(2025, 1, 1), date(2025, 1, 2)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=[], dates_campaign=campaign_dates)
        }

        leave_shift = Shift(
            id="s_leave",
            team_id="t0",
            name="Annual Leave",
            acronym="AL",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 1, 23, 59),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [leave_shift]

        # Request only for Jan 1
        requests = [
            Request(
                id="r0",
                team_id="t0",
                worker_id="w0",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 1, 1),
                shift_id="s_leave",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.UNFULFILLED,
                comment="",
                created_at=datetime.now(),
            )
        ]

        out: Dict[Tuple[str, str, str], int] = {
            ("w0", "2025-01-01", "s_leave"): 1,
            ("w0", "2025-01-02", "s_leave"): 1,
        }

        _zero_unrequested_leave_shifts(
            out,
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts,
            requests,
        )

        # Jan 1 has request, should remain 1
        assert out[("w0", "2025-01-01", "s_leave")] == 1
        # Jan 2 has no request, should be zeroed
        assert out[("w0", "2025-01-02", "s_leave")] == 0


class TestZeroShiftsWithoutDemand:
    """Test _zero_shifts_without_demand function."""

    def test_zero_shifts_without_demand(self) -> None:
        """Test zeroing normal/duty shifts without demand."""
        workers_not_deleted = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
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
        ]

        campaign_dates = [date(2025, 1, 1), date(2025, 1, 2)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=[], dates_campaign=campaign_dates)
        }

        normal_shift = Shift(
            id="s0",
            team_id="t0",
            name="Shift 0",
            acronym="S0",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [normal_shift]

        # Only demand for Jan 1
        daily_shift_demands = [
            ShiftDemandNew(
                id="dsd0",
                team_id="t0",
                date=date(2025, 1, 1),
                shift_id="s0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
        ]

        out: Dict[Tuple[str, str, str], int] = {}

        _zero_shifts_without_demand(
            out,
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts,
            daily_shift_demands,
        )

        # Jan 1 has demand, should not be in output
        assert ("w0", "2025-01-01", "s0") not in out
        # Jan 2 has no demand, should be zeroed
        assert out[("w0", "2025-01-02", "s0")] == 0


# pylint: disable=too-few-public-methods
class TestCoreToEngineFixedValuesIntegration:
    """Integration tests for the full core_to_engine_fixed_values function."""

    # pylint: disable=too-many-locals
    def test_full_integration_basic(self) -> None:
        """Test full function with a basic scenario."""
        # Setup workers
        workers = [
            Worker(
                id="w0",
                team_id="t0",
                name="Worker 0",
                acronym="W0",
                acronym_custom=False,
                employment_start_date=date(2024, 12, 28),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=0,
                annual_leave=0,
                specialty_ids=[],
                deleted=False,
            )
        ]
        workers_not_deleted = workers

        # Setup dates
        hist_dates = [date(2024, 12, 28), date(2024, 12, 29)]
        campaign_dates = [date(2025, 1, 1), date(2025, 1, 2)]
        worker_ids_to_worker_dates = {
            "w0": WorkerDates(dates_hist=hist_dates, dates_campaign=campaign_dates)
        }

        # Setup shifts
        normal_shift = Shift(
            id="s0",
            team_id="t0",
            name="Day Shift",
            acronym="DS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="blue",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        leave_shift = Shift(
            id="s_leave",
            team_id="t0",
            name="Annual Leave",
            acronym="AL",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 1, 23, 59),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        shifts = [normal_shift, leave_shift]

        # Setup historical assignment
        assignments = [
            Assignment(
                id="a0",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                date=date(2024, 12, 28),
                shift_id="s0",
                fixed=True,
                source=AssignmentSource.MANUAL,
            )
        ]

        # Setup requests
        requests = [
            Request(
                id="r0",
                team_id="t0",
                worker_id="w0",
                start_date=date(2025, 1, 1),
                end_date=date(2025, 1, 1),
                shift_id="s_leave",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.UNFULFILLED,
                comment="",
                created_at=datetime.now(),
            )
        ]
        approved_requests = requests

        # Setup shift demands
        daily_shift_demands = [
            ShiftDemandNew(
                id="dsd0",
                team_id="t0",
                date=date(2025, 1, 1),
                shift_id="s0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
        ]

        # Empty dimensions for this test
        dimensions: List[Dimension] = []
        dim_entries: List[DimEntry] = []
        attributes: List[Attribute] = []

        variables = build_engine_variables(
            workers=workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=shifts,
            shifts_not_deleted=shifts,
            shift_id_to_duration_dict=_build_shift_id_to_duration_dict(shifts=shifts),
        )

        result = core_to_engine_fixed_values(
            workers=workers,
            workers_not_deleted=workers_not_deleted,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            shifts=shifts,
            shifts_not_deleted=shifts,
            daily_shift_demands=daily_shift_demands,
            assignments=assignments,
            requests=requests,
            approved_requests=approved_requests,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
            var_model=variables.assignments,
        )

        # Verify historical assignment
        assert result[("w0", "2024-12-28", "s0")] == 1
        assert result[("w0", "2024-12-29", "s0")] == 0

        # Verify leave request on Jan 1 sets leave to 1, normal to 0
        assert result[("w0", "2025-01-01", "s_leave")] == 1
        assert result[("w0", "2025-01-01", "s0")] == 0

        # Verify unrequested leave on Jan 2 is zeroed
        assert result[("w0", "2025-01-02", "s_leave")] == 0
