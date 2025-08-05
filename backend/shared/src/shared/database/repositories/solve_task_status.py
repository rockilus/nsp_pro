from typing import List, Optional

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.solve_task_status import SolveTaskStatusSchema
from shared.schemas.core.solve_task_status import (
    SolveRequestStatus,
    SolveTaskStatus,
)


class SolveTaskStatusRepository(BaseRepository[SolveTaskStatusSchema]):
    """
    Repository for SolveTaskStatus documents in MongoDB.
    """

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "solve_task_status", SolveTaskStatusSchema)

    def create_solve_task_status(
        self, solve_task_status: SolveTaskStatus
    ) -> SolveTaskStatus:
        """Create a new solve task status document from core model."""
        schema = SolveTaskStatusSchema.from_core(solve_task_status)
        created = super().create(schema)
        return created.to_core()

    def get_solve_task_status_by_id(
        self, task_status_id: str
    ) -> Optional[SolveTaskStatus]:
        """Get a solve task status by MongoDB _id, returns core model."""
        schema = self.find_by_id(task_status_id)
        return schema.to_core() if schema else None

    def get_solve_task_status_by_schedule_id(
        self, schedule_id: str
    ) -> List[SolveTaskStatus]:
        """
        Get all solve task statuses for a given schedule_id, returns
        core models.
        """
        schemas = self.find_all({"schedule_id": schedule_id})
        return [s.to_core() for s in schemas]

    def get_solve_task_status_by_solve_id(
        self, solve_id: str
    ) -> Optional[SolveTaskStatus]:
        """
        Get a solve task status by solve_id (business id), returns
        core model.
        """
        schema = self.find_one({"solve_id": solve_id})
        return schema.to_core() if schema else None

    def get_latest_solve_task_status_by_schedule_id(
        self, schedule_id: str
    ) -> Optional[SolveTaskStatus]:
        """
        Get the latest solve task status for a given schedule_id based on
        completed_at timestamp. Returns the solve task status with the
        greatest completed_at value, or None if no completed solve task
        statuses exist for the schedule.
        """
        doc_filter = {
            "schedule_id": schedule_id,
            "completed_at": {"$exists": True, "$ne": None},
        }

        # Use collection directly to get sorting capability
        cursor = self.collection.find(doc_filter).sort("completed_at", -1).limit(1)
        docs = list(cursor)

        if docs:
            schema = SolveTaskStatusSchema.from_mongo(docs[0])
            if schema:
                return schema.to_core()
        return None

    def get_pending_or_in_progress_by_schedule_id(
        self, schedule_id: str
    ) -> List[SolveTaskStatus]:
        """
        Get all solve task statuses for a given schedule_id where
        request_status is PENDING or IN_PROGRESS.
        """

        schemas = self.find_all(
            {
                "schedule_id": schedule_id,
                "request_status": {
                    "$in": [
                        SolveRequestStatus.PENDING.value,
                        SolveRequestStatus.IN_PROGRESS.value,
                    ]
                },
            }
        )
        return [s.to_core() for s in schemas]

    def update_solve_task_status(
        self, solve_task_status: SolveTaskStatus
    ) -> Optional[SolveTaskStatus]:
        """Update a solve task status document by its id, using core model."""
        schema = SolveTaskStatusSchema.from_core(solve_task_status)
        updated = super().update(schema)
        return updated.to_core() if updated else None

    def delete_solve_task_status(self, task_status_id: str) -> None:
        """Delete a solve task status document by its MongoDB _id."""
        result = self.delete(task_status_id)
        if not result:
            raise ValueError(f"SolveTaskStatus with id {task_status_id} not found")
