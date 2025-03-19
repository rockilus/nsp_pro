from typing import List

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.worker import WorkerSchema
from shared.schemas.schemas.worker import Worker


class WorkerRepository(BaseRepository[WorkerSchema]):
    """Repository for worker documents using PyMongo."""

    def __init__(self):
        super().__init__("workers", WorkerSchema)

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
        workers = self.find_all({"team": ObjectId(team_id)})
        return [worker.to_core() for worker in workers]

    def get_workers_not_deleted(self, team_id: str) -> List[Worker]:
        """Get all non-deleted workers for a team."""
        workers = self.find_all({"team": ObjectId(team_id), "deleted": False})
        return [worker.to_core() for worker in workers]

    def get_worker_by_id(self, worker_id: str) -> Worker:
        """Get a worker by its ID."""
        worker = self.find_by_id(worker_id)
        if not worker:
            raise Exception(f"Worker with id {worker_id} not found")
        return worker.to_core()

    def get_workers_by_specialty_id(self, specialty_id: str) -> List[Worker]:
        """Get multiple workers by their specialty ID."""
        workers = self.find_all({"specialties": {"$in": [ObjectId(specialty_id)]}})
        return [worker.to_core() for worker in workers]

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
            {"_id": ObjectId(worker_id)}, {"$set": {"deleted": True}}
        )

        if result.matched_count == 0:
            raise Exception(f"Worker with id {worker_id} not found")

        worker = self.find_by_id(worker_id)
        if not worker:
            raise Exception(f"Failed to retrieve updated worker with id {worker_id}")

        return worker.to_core()
