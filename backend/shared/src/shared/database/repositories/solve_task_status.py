from typing import List, Optional

from shared.database.repositories.base import BaseRepository
from shared.database.schemas.solve_task_status import SolveTaskStatusSchema


class SolveTaskStatusRepository(BaseRepository[SolveTaskStatusSchema]):
    """
    Repository for SolveTaskStatus documents in MongoDB.
    """

    def __init__(self):
        super().__init__("solve_task_status", SolveTaskStatusSchema)

    def create(self, schema: SolveTaskStatusSchema) -> SolveTaskStatusSchema:
        """Create a new solve task status document."""
        return super().create(schema)

    def get_by_id(self, doc_id: str) -> Optional[SolveTaskStatusSchema]:
        """Get a solve task status by MongoDB _id."""
        return self.find_by_id(doc_id)

    def get_by_schedule_id(self, schedule_id: str) -> List[SolveTaskStatusSchema]:
        """Get all solve task statuses for a given schedule_id."""
        return self.find_all({"schedule_id": schedule_id})

    def get_by_solve_id(self, solve_id: str) -> Optional[SolveTaskStatusSchema]:
        """Get a solve task status by solve_id (business id)."""
        return self.find_one({"solve_id": solve_id})

    def update(self, schema: SolveTaskStatusSchema) -> Optional[SolveTaskStatusSchema]:
        """Update a solve task status document by its id."""
        return super().update(schema)
