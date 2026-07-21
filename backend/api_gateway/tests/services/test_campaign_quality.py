"""
Tests for CampaignQualityService.
"""

from datetime import date, datetime, timezone
from typing import List
from unittest.mock import MagicMock

import pytest
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Schedule,
    ScheduleStatus,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    Worker,
)

from src.services.campaign_quality_service import CampaignQualityService


def _make_shift(
    shift_id: str,
    name: str,
    acronym: str,
    shift_type: ShiftType,
    start_hour: int,
    end_hour: int,
    team_id: str = "team_test",
    use_custom_work_time: bool = False,
    custom_work_time_minutes: int = 0,
) -> Shift:
    return Shift(
        id=shift_id,
        team_id=team_id,
        name=name,
        acronym=acronym,
        acronym_custom=False,
        start_time=datetime(2023, 1, 1, start_hour, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 1, 1, end_hour, 0, tzinfo=timezone.utc),
        staffing=[Staffing(specialty_id=None, staffing=1)],
        color="#000000",
        shift_type=shift_type,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
        use_custom_work_time=use_custom_work_time,
        custom_work_time_minutes=custom_work_time_minutes,
    )


def _make_worker(
    worker_id: str,
    name: str,
    team_id: str = "team_test",
    start_date: date = date(2025, 1, 1),
) -> Worker:
    return Worker(
        id=worker_id,
        team_id=team_id,
        name=name,
        acronym=name[:2].upper(),
        acronym_custom=False,
        employment_start_date=start_date,
        employment_end_date=None,
        weekly_hours=40,
        weekly_hours_desired=40,
        duties_per_month=4,
        annual_leave=0,
        specialty_ids=[],
        deleted=False,
        user_id=None,
    )


def _make_schedule(team_id: str = "team_test") -> Schedule:
    return Schedule(
        id="schedule_test",
        team_id=team_id,
        start_date=date(2025, 6, 1),
        end_date=date(2025, 6, 28),
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="user_test",
    )


def _make_assignment(
    assignment_id: str,
    worker_id: str,
    d: date,
    shift_id: str,
    team_id: str = "team_test",
    schedule_id: str = "schedule_test",
) -> Assignment:
    return Assignment(
        id=assignment_id,
        team_id=team_id,
        schedule_id=schedule_id,
        worker_id=worker_id,
        date=d,
        shift_id=shift_id,
        fixed=False,
        source=AssignmentSource.MANUAL,
    )


class TestCampaignQualityService:
    def test_no_campaign_returns_none(self) -> None:
        svc = self._make_service()
        result = svc.build_campaign_quality("team_test")
        assert result is None

    def test_empty_campaign(self) -> None:
        workers = [_make_worker("w1", "Worker 1")]
        shifts = [
            _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12),
            _make_shift("s_duty", "Duty", "D", ShiftType.DUTY, 8, 20),
        ]
        campaign = _make_schedule()
        svc = self._make_service(
            workers=workers, shifts=shifts, campaign=campaign, assignments=[]
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        assert result.numWorkers == 1
        assert result.globalScore == 66.7
        w = result.workers[0]
        assert w.numDuties == 0.0
        assert w.numOnCall == 0.0
        assert w.numWorkingDays == 0
        assert w.workTimeConsistencyScore == 0.0

    def test_perfect_fairness(self) -> None:
        workers = [
            _make_worker("w1", "Alice"),
            _make_worker("w2", "Bob"),
        ]
        shift = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        campaign = _make_schedule()
        assignments = []
        counter = 0
        for d in (
            date(2025, 6, 2),
            date(2025, 6, 3),
            date(2025, 6, 4),
            date(2025, 6, 5),
        ):
            for w in workers:
                assignments.append(_make_assignment(f"a_{counter}", w.id, d, shift.id))
                counter += 1

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        assert result.fairnessTimeWorkedScore >= 99.0
        assert result.fairnessDutiesScore >= 99.0

    def test_duty_on_call_counting(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        duty_shift = _make_shift("s_duty", "Duty", "D", ShiftType.DUTY, 8, 20)
        oncall_shift = _make_shift("s_oncall", "OnCall", "OC", ShiftType.ON_CALL, 20, 8)
        normal_shift = _make_shift("s_normal", "Normal", "N", ShiftType.NORMAL, 8, 12)
        leave_shift = _make_shift(
            "s_leave",
            "Leave",
            "L",
            ShiftType.LEAVE,
            0,
            8,
        )
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), duty_shift.id),
            _make_assignment("a2", "w1", date(2025, 6, 3), oncall_shift.id),
            _make_assignment("a3", "w1", date(2025, 6, 4), normal_shift.id),
            _make_assignment("a4", "w1", date(2025, 6, 5), leave_shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[duty_shift, oncall_shift, normal_shift, leave_shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        raw_duties = 1  # 1 duty assignment (normalized: 1 * 28/28 = 1)
        assert w.numDuties == pytest.approx(raw_duties, abs=0.1)
        assert w.numOnCall == pytest.approx(1.0, abs=0.1)
        assert w.numWorkingDays == 3

    def test_weekend_time_work(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        shift = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        campaign = _make_schedule()
        saturday = date(2025, 6, 7)
        assert saturday.weekday() == 5
        sunday = date(2025, 6, 8)
        assert sunday.weekday() == 6
        weekday = date(2025, 6, 9)
        assert weekday.weekday() == 0
        assignments = [
            _make_assignment("a1", "w1", saturday, shift.id),
            _make_assignment("a2", "w1", sunday, shift.id),
            _make_assignment("a3", "w1", weekday, shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.timeWorkedMinutes > w.timeWorkedWeekendMinutes

    def test_shift_spread_clustered(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        shift = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), shift.id),
            _make_assignment("a2", "w1", date(2025, 6, 3), shift.id),
            _make_assignment("a3", "w1", date(2025, 6, 4), shift.id),
            _make_assignment("a4", "w1", date(2025, 6, 5), shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.shiftSpreadScore == 0.0

    def test_shift_spread_even(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        shift = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), shift.id),
            _make_assignment("a2", "w1", date(2025, 6, 9), shift.id),
            _make_assignment("a3", "w1", date(2025, 6, 16), shift.id),
            _make_assignment("a4", "w1", date(2025, 6, 23), shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.shiftSpreadScore == 75.0

    def test_shift_diversity_normalized(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        s1 = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        s2 = _make_shift("s_duty", "Duty", "D", ShiftType.DUTY, 8, 20)
        s3 = _make_shift("s_oncall", "OnCall", "OC", ShiftType.ON_CALL, 20, 8)
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), s1.id),
            _make_assignment("a2", "w1", date(2025, 6, 3), s2.id),
            _make_assignment("a3", "w1", date(2025, 6, 4), s3.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[s1, s2, s3],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.shiftDiversityScore > 90.0

    def test_work_time_consistency(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        shift = _make_shift("s_long", "Long", "L", ShiftType.NORMAL, 8, 20)
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), shift.id),
            _make_assignment("a2", "w1", date(2025, 6, 2), shift.id),
            _make_assignment("a3", "w1", date(2025, 6, 9), shift.id),
            _make_assignment("a4", "w1", date(2025, 6, 16), shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.workTimeConsistencyScore < 100.0

    def test_custom_work_time_shift(self) -> None:
        workers = [_make_worker("w1", "Alice")]
        shift = _make_shift(
            "s_custom",
            "Custom",
            "C",
            ShiftType.NORMAL,
            8,
            12,
            use_custom_work_time=True,
            custom_work_time_minutes=480,
        )
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        w = result.workers[0]
        assert w.timeWorkedMinutes == 480.0

    def test_worker_with_no_assignments(self) -> None:
        workers = [
            _make_worker("w1", "Alice"),
            _make_worker("w2", "Bob"),
        ]
        shift = _make_shift("s_morning", "Morning", "M", ShiftType.NORMAL, 8, 12)
        campaign = _make_schedule()
        assignments = [
            _make_assignment("a1", "w1", date(2025, 6, 2), shift.id),
        ]

        svc = self._make_service(
            workers=workers,
            shifts=[shift],
            campaign=campaign,
            assignments=assignments,
        )
        result = svc.build_campaign_quality("team_test")
        assert result is not None
        assert len(result.workers) == 2
        bob = result.workers[1]
        assert bob.numDuties == 0.0
        assert bob.numWorkingDays == 0

    @staticmethod
    def _make_service(
        workers: List[Worker] | None = None,
        shifts: List[Shift] | None = None,
        campaign: Schedule | None = None,
        assignments: List[Assignment] | None = None,
    ) -> CampaignQualityService:
        mock = MagicMock()
        mock.schedule_db.get_schedule_campaign.return_value = campaign
        mock.worker_db.get_workers_not_deleted.return_value = workers or []
        mock.shift_db.get_shifts_not_deleted.return_value = shifts or []
        mock.assignment_db.get_assignments_by_schedule_id.return_value = (
            assignments or []
        )
        return CampaignQualityService(collection=mock)
