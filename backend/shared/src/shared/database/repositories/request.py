from datetime import date, datetime, timezone
from typing import List

from shared.database.interface import DatabaseInterface
from shared.database.repositories.base import BaseRepository
from shared.database.schemas.request import RequestSchema
from shared.schemas.core.request import (
    Request,
    RequestStatus,
    RequestType,
)


class RequestRepository(BaseRepository[RequestSchema]):
    """Repository for request documents using PyMongo."""

    def __init__(self, database_interface: DatabaseInterface):
        super().__init__(database_interface, "requests", RequestSchema)

    def create_request(self, request: Request) -> Request:
        """Create a new request."""
        request_schema = RequestSchema.from_core(request)
        result = self.create(request_schema)
        return result.to_core()

    def get_requests(self, workers: List[str]) -> List[Request]:
        """Get all requests for a list of workers."""
        requests = self.find_all({"worker": {"$in": workers}})
        return [request.to_core() for request in requests]

    def get_request_by_id(self, request_id: str) -> Request:
        """Get a request by its ID."""
        request = self.find_by_id(request_id)
        if not request:
            raise Exception(f"Request with id {request_id} not found")
        return request.to_core()

    # pylint: disable=too-many-arguments, too-many-positional-arguments
    def get_requests_by_dates(
        self,
        start_date: date,
        end_date: date,
        worker_ids: List[str],
        request_type: RequestType | None = None,
        status: RequestStatus | None = None,
    ) -> List[Request]:
        """Get all requests within a date range for a list of workers.

        Optionally filter by request_type and/or status. If either optional
        argument is provided the corresponding field will be added to the
        MongoDB query.
        """
        start_timestamp = datetime.combine(
            start_date, datetime.min.time(), timezone.utc
        ).timestamp()
        end_timestamp = datetime.combine(
            end_date, datetime.min.time(), timezone.utc
        ).timestamp()

        # Return requests that overlap the requested period. A request
        # overlaps [start_date, end_date] when its start_date <= end_date
        # and its end_date >= start_date.
        query = {
            "start_date": {"$lte": end_timestamp},
            "end_date": {"$gte": start_timestamp},
            "worker": {"$in": worker_ids},
        }

        if request_type is not None:
            # store enum as its value in the DB
            query["request_type"] = request_type.value

        if status is not None:
            query["status"] = status.value

        requests = self.find_all(query)
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
        self.collection.delete_many({"worker": worker_id})

    def delete_requests_by_shift_id(self, shift_id: str) -> None:
        """Delete all requests for a shift by shift ID."""
        self.collection.delete_many({"shift": shift_id})
