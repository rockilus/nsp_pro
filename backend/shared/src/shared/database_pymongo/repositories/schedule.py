from datetime import date, datetime, timezone
from typing import List, Optional

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.schedule import ScheduleSchema
from shared.schemas.schemas.schedule import Schedule, ScheduleStatus


class ScheduleRepository(BaseRepository[ScheduleSchema]):
    """Repository for schedule documents using PyMongo."""

    def __init__(self):
        super().__init__("schedules", ScheduleSchema)

    def create_schedule(self, schedule: Schedule) -> Schedule:
        """Create a new schedule."""
        schedule_schema = ScheduleSchema.from_core(schedule)
        result = self.create(schedule_schema)
        return result.to_core()

    def get_schedules(self, team_id: str) -> List[Schedule]:
        """Get all schedules for a team."""
        schedules = self.find_all({"team": ObjectId(team_id)})
        return [schedule.to_core() for schedule in schedules]

    def get_schedule_campaign(self, team_id: str) -> Optional[Schedule]:
        """Get the campaign schedule for a team."""
        schedule = self.find_all(
            {
                "team": ObjectId(team_id),
                "status": ScheduleStatus.CAMPAIGN.value,
            },
            limit=1,
        )
        return schedule[0].to_core() if schedule else None

    def get_schedule_campaign_by_constraint_build_id(
        self, team_id: str, cb_id: str
    ) -> Optional[Schedule]:
        """Get the campaign schedule by constraint build ID for a team."""
        schedule = self.find_all(
            {
                "constraint_build_ids": ObjectId(cb_id),
                "status": ScheduleStatus.CAMPAIGN.value,
                "team": ObjectId(team_id),
            },
            limit=1,
        )
        return schedule[0].to_core() if schedule else None

    def get_schedule_by_id(self, schedule_id: str) -> Schedule:
        """Get a schedule by its ID."""
        schedule = self.find_by_id(schedule_id)
        if not schedule:
            raise Exception(f"Schedule with id {schedule_id} not found")
        return schedule.to_core()

    def get_schedules_before_date(self, s_date: date, team_id: str) -> List[Schedule]:
        """Get all schedules before a specific date for a team."""
        s_timestamp = datetime.combine(
            s_date, datetime.min.time(), tzinfo=timezone.utc
        ).timestamp()
        schedules = self.find_all(
            {"end_date": {"$lt": s_timestamp}, "team": ObjectId(team_id)}
        )
        return [schedule.to_core() for schedule in schedules]

    def get_schedule_quick_staffing_contain_shift_id(
        self, shift_id: str
    ) -> List[Schedule]:
        """Get all schedules containing a specific shift ID in quick staffing."""
        schedules = self.find_all({"quick_staffings.shift_id": ObjectId(shift_id)})
        return [schedule.to_core() for schedule in schedules]

    def get_schedule_quick_staffing_contain_worker_id(
        self, worker_id: str
    ) -> List[Schedule]:
        """Get all schedules containing a specific worker ID in quick staffing."""
        schedules = self.find_all({"quick_staffings.worker_id": ObjectId(worker_id)})
        return [schedule.to_core() for schedule in schedules]

    def update_schedule(self, schedule: Schedule) -> Optional[Schedule]:
        """Update a schedule."""
        schedule_schema = ScheduleSchema.from_core(schedule)
        schedule_updated = self.update(schedule_schema)
        return schedule_updated.to_core() if schedule_updated else None

    def delete_schedule(self, schedule_id: str) -> None:
        """Delete a schedule by its ID."""
        result = self.delete(schedule_id)
        if result is False:
            raise Exception(
                f"Schedule with id {schedule_id} not found or already deleted"
            )
