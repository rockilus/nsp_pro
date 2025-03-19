from datetime import date, datetime, timezone
from typing import List

from bson import ObjectId

from shared.database_pymongo.repositories.base import BaseRepository
from shared.database_pymongo.schemas.request import RequestSchema
from shared.schemas.schemas.request import Request


class RequestRepository(BaseRepository[RequestSchema]):
    """Repository for request documents using PyMongo."""

    def __init__(self):
        super().__init__("requests", RequestSchema)

    def create_request(self, request: Request) -> Request:
        """Create a new request."""
        request_schema = RequestSchema.from_core(request)
        result = self.create(request_schema)
        return result.to_core()

    def get_requests(self, worker_ids: List[str]) -> List[Request]:
        """Get all requests for a list of workers."""
        requests = self.find_all(
            {"worker": {"$in": [ObjectId(id) for id in worker_ids]}}
        )
        return [request.to_core() for request in requests]

    def get_request_by_id(self, request_id: str) -> Request:
        """Get a request by its ID."""
        request = self.find_by_id(request_id)
        if not request:
            raise Exception(f"Request with id {request_id} not found")
        return request.to_core()

    def get_requests_by_dates(
        self, start_date: date, end_date: date, worker_ids: List[str]
    ) -> List[Request]:
        """Get all requests within a date range for a list of workers."""
        start_timestamp = datetime.combine(
            start_date, datetime.min.time(), timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(
            end_date, datetime.min.time(), timezone.utc
        ).timestamp()
        requests = self.find_all(
            {
                "start_date": {"$gte": start_timestamp},
                "end_date": {"$lte": end_timestamp},
                "worker": {"$in": [ObjectId(id) for id in worker_ids]},
            }
        )
        return [request.to_core() for request in requests]

    def update_request(self, request: Request) -> Request:
        """Update a request."""
        request_schema = RequestSchema.from_core(request)
        request_updated = self.update(request_schema)
        assert request_updated is not None
        return request_updated.to_core()

    def update_requests(self, requests: List[Request]) -> List[Request]:
        """Update multiple requests."""
        if not requests:
            return []

        updated_requests = []
        for request in requests:
            updated = self.update_request(request)
            updated_requests.append(updated)

        return updated_requests

    def delete_request(self, request_id: str) -> None:
        """Delete a request by its ID."""
        result = self.delete(request_id)
        if result is False:
            raise Exception(
                f"Request with id {request_id} not found or already deleted"
            )

    def delete_requests_by_worker_id(self, worker_id: str) -> None:
        """Delete all requests for a worker by worker ID."""
        self.collection.delete_many({"worker": ObjectId(worker_id)})

    def delete_requests_by_shift_id(self, shift_id: str) -> None:
        """Delete all requests for a shift by shift ID."""
        self.collection.delete_many({"shift": ObjectId(shift_id)})
