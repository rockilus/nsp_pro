from datetime import date, datetime, time, timezone
from typing import List, Union

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.assignment import AssignmentSchema
from shared.schemas.core.assignment import Assignment


# pylint: disable=too-many-public-methods
class AssignmentRepository(BaseRepository[AssignmentSchema]):
    """Repository for assignment documents using PyMongo."""

    def __init__(self):
        super().__init__("assignments", AssignmentSchema)

    def create_assignment(self, assignment: Assignment) -> Assignment:
        """Create a new assignment."""
        assignment_schema = AssignmentSchema.from_core(assignment)
        result = self.create(assignment_schema)
        return result.to_core()

    def create_assignments(self, assignments: List[Assignment]) -> List[Assignment]:
        """Create multiple assignments at once."""
        if not assignments:
            return []

        assignment_schemas = [AssignmentSchema.from_core(a) for a in assignments]
        result = self.create_many(assignment_schemas)
        return [a.to_core() for a in result]

    def get_assignments(self, team_id: str) -> List[Assignment]:
        """Get all assignments for a team."""
        assignments = self.find_all({"team": team_id})
        return [a.to_core() for a in assignments]

    def get_assignment_by_id(self, assignment_id: str) -> Assignment:
        """Get an assignment by its ID."""
        assignment = self.find_by_id(assignment_id)
        if not assignment:
            raise Exception(f"Assignment with id {assignment_id} not found")
        return assignment.to_core()

    def get_assignment_by_worker_id_date_schedule_id(
        self, worker_id: str, a_date: date, schedule_id: str
    ) -> Union[Assignment, None]:
        """Get an assignment by worker, date, and schedule."""
        assignment = self.find_all(
            {
                "worker": worker_id,
                "date": datetime(a_date.year, a_date.month, a_date.day),
                "schedule": schedule_id,
            }
        )
        return assignment[0].to_core() if assignment else None

    def get_assignment_by_worker_shift_team_and_date(
        self, worker_id: str, shift_id: str, team_id: str, a_date: date
    ) -> Union[Assignment, None]:
        """Get an assignment by worker ID, shift ID, team ID, and date."""
        assignment = self.find_all(
            {
                "worker": worker_id,
                "shift": shift_id,
                "team": team_id,
                "date": datetime(a_date.year, a_date.month, a_date.day),
            }
        )
        return assignment[0].to_core() if assignment else None

    def get_assignments_by_dates(
        self, team_id: str, start_date: date, end_date: date
    ) -> List[Assignment]:
        """Get all assignments for a team within a date range."""
        assignments = self.find_all(
            {
                "team": team_id,
                "date": {
                    "$gte": datetime(start_date.year, start_date.month, start_date.day),
                    "$lte": datetime(end_date.year, end_date.month, end_date.day),
                },
            }
        )
        return [a.to_core() for a in assignments]

    def get_assignments_by_schedule_id(self, schedule_id: str) -> List[Assignment]:
        """Get all assignments for a specific schedule."""
        assignments = self.find_all({"schedule": schedule_id})
        return [a.to_core() for a in assignments]

    def get_assignments_by_schedule_ids(
        self, schedule_ids: List[str]
    ) -> List[Assignment]:
        """Get all assignments for a list of schedule IDs."""
        assignments = self.find_all({"schedule": {"$in": schedule_ids}})
        return [a.to_core() for a in assignments]

    def get_assignments_fixed_by_schedule_ids(
        self, schedule_ids: List[str]
    ) -> List[Assignment]:
        """Get all fixed assignments for a list of schedule IDs."""
        assignments = self.find_all({"fixed": True, "schedule": {"$in": schedule_ids}})
        return [a.to_core() for a in assignments]

    def get_assignments_by_team_and_shifts_today_onward(
        self, team_id: str, shift_ids: List[str]
    ) -> List[Assignment]:
        """Get all assignments for a team and list of shift IDs from today onward."""
        today = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        assignments = self.find_all(
            {
                "team": team_id,
                "shift": {"$in": shift_ids},
                "date": {"$gte": today},
            }
        )
        return [a.to_core() for a in assignments]

    def get_assignments_by_reference_id(self, reference_id: str) -> List[Assignment]:
        """Get assignments by their reference assignment ID."""
        assignments = self.find_all({"reference_assignment_id": reference_id})
        return [assignment.to_core() for assignment in assignments]

    def update_assignment(self, assignment: Assignment) -> Assignment:
        """Update an assignment."""
        assignment_schema = AssignmentSchema.from_core(assignment)
        assignment_updated = self.update(assignment_schema)
        assert assignment_updated is not None
        return assignment_updated.to_core()

    def update_assignments(self, assignments: List[Assignment]) -> List[Assignment]:
        """Update multiple assignments."""
        if not assignments:
            return []

        updated_assignments = []
        for assignment in assignments:
            updated = self.update_assignment(assignment)
            updated_assignments.append(updated)

        return updated_assignments

    def delete_assignment(self, assignment_id: str) -> None:
        """Delete an assignment by its ID."""
        result = self.delete(assignment_id)
        if result is False:
            raise Exception(
                f"Assignment with id {assignment_id} not found or already deleted"
            )

    def delete_assignments_by_schedule_id(self, schedule_id: str) -> None:
        """Delete all assignments for a specific schedule."""
        self.collection.delete_many({"schedule": schedule_id})

    def delete_assignments_by_worker_id(self, worker_id: str) -> None:
        """Delete all assignments for a specific worker."""
        self.collection.delete_many({"worker": worker_id})

    def delete_assignments_by_shift_id(self, shift_id: str) -> None:
        """Delete all assignments for a specific shift."""
        self.collection.delete_many({"shift": shift_id})

    def delete_assignments_by_team_and_shift_today_onward(
        self, team_id: str, shift_id: str
    ) -> None:
        """Delete all assignments from today onward for a specific team and shift."""
        today = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        self.collection.delete_many(
            {
                "team": team_id,
                "shift": shift_id,
                "date": {"$gte": today},
            }
        )

    def delete_assignments_by_team_worker_shift_and_date(
        self, team_id: str, worker_id: str, shift_id: str, a_date: date
    ) -> List[str]:
        """Delete assignments for a given team ID, worker ID, shift ID, and date."""
        start_of_day = datetime.combine(a_date, time.min, tzinfo=timezone.utc)
        end_of_day = datetime.combine(a_date, time.max, tzinfo=timezone.utc)
        # Find the matching assignments and get their IDs
        matching_assignments = self.collection.find(
            {
                "team": team_id,
                "worker": worker_id,
                "shift": shift_id,
                "date": {"$gte": start_of_day, "$lte": end_of_day},
            },
            {"_id": 1},  # Only retrieve the `_id` field
        )
        deleted_ids = [assignment["_id"] for assignment in matching_assignments]

        # Delete the matching assignments
        self.collection.delete_many(
            {
                "team": team_id,
                "worker": worker_id,
                "shift": shift_id,
                "date": {"$gte": start_of_day, "$lte": end_of_day},
            }
        )

        return deleted_ids

    def delete_assignments_by_reference_id(self, reference_id: str) -> List[str]:
        """Delete assignments by their reference assignment ID and return their IDs."""
        matching_assignments = self.collection.find(
            {"reference_assignment_id": reference_id}, {"_id": 1}
        )
        deleted_ids = [assignment["_id"] for assignment in matching_assignments]

        self.collection.delete_many({"reference_assignment_id": reference_id})

        return deleted_ids

    def delete_assignments_by_recurrence_rule_id_from_date(
        self, recurrence_rule_id: str, from_date: date
    ) -> List[str]:
        start_of_day = datetime.combine(from_date, time.min, tzinfo=timezone.utc)

        # Find the matching assignments and get their IDs
        matching_assignments = self.collection.find(
            {
                "recurrence_rule_id": recurrence_rule_id,
                "date": {"$gte": start_of_day},
            },
            {"_id": 1},  # Only retrieve the `_id` field
        )
        deleted_ids = [assignment["_id"] for assignment in matching_assignments]

        # Delete the matching assignments
        self.collection.delete_many(
            {
                "recurrence_rule_id": recurrence_rule_id,
                "date": {"$gte": start_of_day},
            }
        )

        return deleted_ids

    def delete_assignments_by_recurrence_rule_id(
        self, recurrence_rule_id: str
    ) -> List[str]:
        # Find the matching assignments and get their IDs
        matching_assignments = self.collection.find(
            {"recurrence_rule_id": recurrence_rule_id}, {"_id": 1}
        )
        deleted_ids = [assignment["_id"] for assignment in matching_assignments]

        # Delete the matching assignments
        self.collection.delete_many({"recurrence_rule_id": recurrence_rule_id})

        return deleted_ids

    def delete_assignments_by_schedule_id_and_dates(
        self, schedule_id: str, dates: List[date]
    ) -> None:
        """Delete assignments by a schedule ID and a list of dates."""
        if not schedule_id or not dates:
            return

        # Convert dates to datetime objects
        date_filters = [
            datetime(d.year, d.month, d.day, tzinfo=timezone.utc) for d in dates
        ]

        self.collection.delete_many(
            {
                "schedule": schedule_id,
                "date": {"$in": date_filters},
            }
        )
