from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.worker import WorkerSchema
from shared.schemas.core.worker import Worker


class WorkerRepository(BaseRepository[WorkerSchema]):
    """Repository for worker documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "workers", WorkerSchema)

    def create_worker(self, worker: Worker) -> Worker:
        """Create a new worker."""
        worker_schema = WorkerSchema.from_core(worker)
        result = self.create(worker_schema)
        return result.to_core()

    def create_workers(self, workers: List[Worker]) -> List[Worker]:
        """Create multiple workers at once."""
        if not workers:
            return []

        worker_schemas = [WorkerSchema.from_core(worker) for worker in workers]
        result = self.create_many(worker_schemas)
        return [worker.to_core() for worker in result]

    def get_workers(self, team_id: str) -> List[Worker]:
        """Get all workers for a team."""
        workers = self.find_all({"team": team_id})
        return [worker.to_core() for worker in workers]

    def get_workers_not_deleted(self, team_id: str) -> List[Worker]:
        """Get all non-deleted workers for a team."""
        workers = self.find_all({"team": team_id, "deleted": False})
        return [worker.to_core() for worker in workers]

    def get_worker_by_id(self, worker_id: str) -> Worker | None:
        """Get a worker by its ID."""
        worker = self.find_by_id(worker_id)
        if not worker:
            return None
        return worker.to_core()

    def get_workers_by_specialty_id(self, specialty_id: str) -> List[Worker]:
        """Get multiple workers by their specialty ID."""
        workers = self.find_all({"specialties": {"$in": [specialty_id]}})
        return [worker.to_core() for worker in workers]

    def get_workers_by_team_and_user(self, team_id: str, user_id: str) -> List[Worker]:
        """Get all workers for a specific team and user."""
        workers = self.find_all({"team": team_id, "user_id": user_id})
        return [worker.to_core() for worker in workers]

    def get_workers_by_ids(
        self, worker_ids: List[str], raise_on_missing: bool = False
    ) -> List[Worker]:
        """Get multiple workers by their IDs.

        Forgiving behavior by default: missing IDs are ignored. If
        `raise_on_missing` is True, raises `ValueError` when any id is not
        found.
        """
        if not worker_ids:
            return []

        workers = self.find_all({"_id": {"$in": worker_ids}})
        results = [worker.to_core() for worker in workers]

        if raise_on_missing:
            found_ids = {r.id for r in results}
            missing = [wid for wid in worker_ids if wid not in found_ids]
            if missing:
                raise ValueError(f"Workers not found for ids: {missing}")

        return results

    def update_worker(self, worker: Worker) -> Worker:
        """Update a worker."""
        worker_schema = WorkerSchema.from_core(worker)
        worker_updated = self.update(worker_schema)
        assert worker_updated is not None
        return worker_updated.to_core()

    def update_workers(self, workers: List[Worker]) -> List[Worker]:
        """Update multiple workers."""
        if not workers:
            return []

        updated_workers = []
        for worker in workers:
            updated = self.update_worker(worker)
            updated_workers.append(updated)

        return updated_workers

    def delete_worker(self, worker_id: str) -> None:
        """Delete a worker by its ID."""
        result = self.delete(worker_id)
        if result is False:
            raise Exception(f"Worker with id {worker_id} not found or already deleted")

    def logical_delete_worker(self, worker_id: str) -> Worker:
        """Mark a worker as deleted."""
        result = self.collection.update_one(
            {"_id": worker_id}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Worker with id {worker_id} not found")

        worker = self.find_by_id(worker_id)
        if not worker:
            raise Exception(f"Failed to retrieve updated worker with id {worker_id}")

        return worker.to_core()
