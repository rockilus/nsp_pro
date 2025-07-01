from typing import List, Optional

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

    def __init__(self):
        super().__init__("solve_task_status", SolveTaskStatusSchema)

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
        """Get all solve task statuses for a given schedule_id, returns core models."""
        schemas = self.find_all({"schedule_id": schedule_id})
        return [s.to_core() for s in schemas]

    def get_solve_task_status_by_solve_id(
        self, solve_id: str
    ) -> Optional[SolveTaskStatus]:
        """Get a solve task status by solve_id (business id), returns core model."""
        schema = self.find_one({"solve_id": solve_id})
        return schema.to_core() if schema else None

    def get_pending_or_in_progress_by_schedule_id(
        self, schedule_id: str
    ) -> List[SolveTaskStatus]:
        """
        Get all solve task statuses for a given schedule_id where request_status
        is PENDING or IN_PROGRESS.
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
