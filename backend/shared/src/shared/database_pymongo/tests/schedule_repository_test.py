from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.schedule import ScheduleRepository
from shared.database_pymongo.schemas.schedule import (
    QuickStaffingSchema,
    ScheduleSchema,
)
from shared.schemas.schemas.schedule import (
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
)


class TestScheduleRepository:
    repo: ScheduleRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ScheduleRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_schedule(self):
        """Test creating a schedule."""
        schedule = Schedule(
            id=None,
            team_id=str(ObjectId()),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).date(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )

        result = self.repo.create_schedule(schedule)

        assert result.id is not None
        assert result.team_id == schedule.team_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == ObjectId(schedule.team_id)

    def test_get_schedule_by_id(self):
        """Test getting a schedule by ID."""
        schedule = ScheduleSchema(
            team=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )
        created = self.repo.create(schedule)

        found = self.repo.get_schedule_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_id == str(schedule.team)

    def test_update_schedule(self):
        """Test updating a schedule."""
        schedule = ScheduleSchema(
            team=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )
        created = self.repo.create(schedule)

        updated_schedule = Schedule(
            id=str(created.id),
            team_id=str(ObjectId()),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).date(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.SOLVED,
            status=ScheduleStatus.VALIDATED,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )

        result = self.repo.update_schedule(updated_schedule)

        assert result.solve_status == ScheduleSolveStatus.SOLVED
        assert result.status == ScheduleStatus.VALIDATED

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["solve_status"] == ScheduleSolveStatus.SOLVED.value
        assert from_db["status"] == ScheduleStatus.VALIDATED.value

    def test_delete_schedule(self):
        """Test deleting a schedule."""
        schedule = ScheduleSchema(
            team=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )
        created = self.repo.create(schedule)

        self.repo.delete_schedule(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_schedules(self):
        """Test getting all schedules for a team."""
        team_oid = ObjectId()
        schedules = [
            ScheduleSchema(
                team=team_oid,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
                solve_details=None,
                solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_build_ids=[],
                quick_staffings=[],
            ),
            ScheduleSchema(
                team=team_oid,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
                solve_details=None,
                solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_build_ids=[],
                quick_staffings=[],
            ),
        ]
        self.repo.create_many(schedules)

        result = self.repo.get_schedules(str(team_oid))

        assert len(result) == 2

    def test_get_schedule_campaign(self):
        """Test getting the campaign schedule for a team."""
        team_oid = ObjectId()
        schedule = ScheduleSchema(
            team=team_oid,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_campaign(str(team_oid))

        assert result is not None
        assert result.status == ScheduleStatus.CAMPAIGN

    def test_get_schedule_campaign_by_constraint_build_id(self):
        """Test getting the campaign schedule by constraint build ID for a team."""
        team_oid = ObjectId()
        cb_oid = ObjectId()
        schedule = ScheduleSchema(
            team=team_oid,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[cb_oid],
            quick_staffings=[],
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_campaign_by_constraint_build_id(
            str(team_oid), str(cb_oid)
        )

        assert result is not None
        assert str(cb_oid) in result.constraint_build_ids

    def test_get_schedules_before_date(self):
        """Test getting all schedules before a specific date for a team."""
        team_oid = ObjectId()
        schedules = [
            ScheduleSchema(
                team=team_oid,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
                solve_details=None,
                solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_build_ids=[],
                quick_staffings=[],
            ),
            ScheduleSchema(
                team=team_oid,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
                solve_details=None,
                solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_build_ids=[],
                quick_staffings=[],
            ),
        ]
        self.repo.create_many(schedules)

        result = self.repo.get_schedules_before_date(
            datetime(2023, 2, 15, tzinfo=timezone.utc).date(), str(team_oid)
        )

        assert len(result) == 2

    def test_get_schedule_quick_staffing_contain_shift_id(self):
        """
        Test getting all schedules containing a specific shift ID in quick staffing.
        """
        shift_oid = ObjectId()
        schedule = ScheduleSchema(
            team=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[
                QuickStaffingSchema(worker_id=ObjectId(), shift_id=shift_oid, target=1)
            ],
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_quick_staffing_contain_shift_id(str(shift_oid))

        assert len(result) == 1
        assert result[0].quick_staffings[0].shift_id == str(shift_oid)

    def test_get_schedule_quick_staffing_contain_worker_id(self):
        """
        Test getting all schedules containing a specific worker ID in quick staffing.
        """
        worker_oid = ObjectId()
        schedule = ScheduleSchema(
            team=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED.value,
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[
                QuickStaffingSchema(worker_id=worker_oid, shift_id=ObjectId(), target=1)
            ],
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_quick_staffing_contain_worker_id(
            str(worker_oid)
        )

        assert len(result) == 1
        assert result[0].quick_staffings[0].worker_id == str(worker_oid)
