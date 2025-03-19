from datetime import date, datetime
from typing import List, Union

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.assignment import AssignmentSchema
from shared.schemas.schemas.schedule import Assignment


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
        assignments = self.find_all({"team": ObjectId(team_id)})
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
                "worker": ObjectId(worker_id),
                "date": datetime(a_date.year, a_date.month, a_date.day),
                "schedule": ObjectId(schedule_id),
            }
        )
        return assignment[0].to_core() if assignment else None

    def get_assignments_by_dates(
        self, team_id: str, start_date: date, end_date: date
    ) -> List[Assignment]:
        """Get all assignments for a team within a date range."""
        assignments = self.find_all(
            {
                "team": ObjectId(team_id),
                "date": {
                    "$gte": datetime(start_date.year, start_date.month, start_date.day),
                    "$lte": datetime(end_date.year, end_date.month, end_date.day),
                },
            }
        )
        return [a.to_core() for a in assignments]

    def get_assignments_by_schedule_id(self, schedule_id: str) -> List[Assignment]:
        """Get all assignments for a specific schedule."""
        assignments = self.find_all({"schedule": ObjectId(schedule_id)})
        return [a.to_core() for a in assignments]

    def get_assignments_by_schedule_ids(
        self, schedule_ids: List[str]
    ) -> List[Assignment]:
        """Get all assignments for a list of schedule IDs."""
        assignments = self.find_all(
            {"schedule": {"$in": [ObjectId(i) for i in schedule_ids]}}
        )
        return [a.to_core() for a in assignments]

    def get_assignments_fixed_by_schedule_ids(
        self, schedule_ids: List[str]
    ) -> List[Assignment]:
        """Get all fixed assignments for a list of schedule IDs."""
        assignments = self.find_all(
            {
                "fixed": True,
                "schedule": {"$in": [ObjectId(i) for i in schedule_ids]},
            }
        )
        return [a.to_core() for a in assignments]

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
        self.collection.delete_many({"schedule": ObjectId(schedule_id)})

    def delete_assignments_by_worker_id(self, worker_id: str) -> None:
        """Delete all assignments for a specific worker."""
        self.collection.delete_many({"worker": ObjectId(worker_id)})

    def delete_assignments_by_shift_id(self, shift_id: str) -> None:
        """Delete all assignments for a specific shift."""
        self.collection.delete_many({"shift": ObjectId(shift_id)})
