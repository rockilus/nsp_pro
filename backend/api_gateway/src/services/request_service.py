from datetime import datetime, timedelta, timezone
from typing import List

from shared.augment import r_to_r_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    Dimension,
    DimEntry,
    FulfillmentStatus,
    Request,
    RequestAugmented,
    RequestStatus,
    RequestType,
    Worker,
)
from shared.schemas.core.constraint import SWOIdTypes

from src.services.assignment_service import AssignmentService
from src.services.base_service import BaseService
from src.services.notification_service import NotificationService


class RequestService(BaseService):

    def __init__(
        self,
        collection: DatabaseCollections,
        assignment_service: AssignmentService,
        notification_service: NotificationService,
    ):
        super().__init__(collection)
        self.assignment_service = assignment_service
        self.notification_service = notification_service

    def create_request(
        self, request: Request, author_id: str, team_role: str
    ) -> RequestAugmented:
        if not self.authz_request_team_member(
            new_request_worker_id=request.worker_id,
            author_id=author_id,
            team_id=request.team_id,
            team_role=team_role,
        ):
            raise ValueError(
                "You are not allowed to create a request for another worker"
            )
        request.created_at = datetime.now(tz=timezone.utc)
        request.status = RequestStatus.PENDING
        request.fulfillment = FulfillmentStatus.UNFULFILLED
        new_request = self.collection.request_db.create_request(request)
        return self._to_request_augmented(new_request)

    def get_requests(
        self, team_id: str, worker_id: str | None = None
    ) -> List[RequestAugmented]:
        """Get requests for a team, optionally filtered by worker_id.

        Args:
            team_id: Team ID to get requests for
            worker_id: Optional worker ID to filter requests. If None, returns
            all team requests.

        Returns:
            List of augmented request objects
        """
        if worker_id:
            # Filter by specific worker
            worker = self.collection.worker_db.get_worker_by_id(worker_id)
            if not worker or worker.team_id != team_id:
                return []  # Worker not found or doesn't belong to team
            requests = self.collection.request_db.get_requests([worker_id])
            return self._to_requests_augmented(requests, team_id)
        # Get all requests for team (existing behavior)
        workers = self.collection.worker_db.get_workers(team_id)
        requests = self.collection.request_db.get_requests([w.id for w in workers])
        return self._to_requests_augmented(requests, team_id)

    def get_requests_by_workers(self, workers: List[Worker]) -> List[RequestAugmented]:
        if not workers:
            return []
        team_id = workers[0].team_id
        requests = self.collection.request_db.get_requests([w.id for w in workers])
        return self._to_requests_augmented(requests, team_id)

    # pylint: disable=R0801
    def update_request(
        self, request: Request, author_id: str, team_role: str
    ) -> RequestAugmented:
        old_request = self.collection.request_db.get_request_by_id(
            request_id=request.id
        )
        if not old_request:
            raise ValueError(f"Request with id {request.id} not found")
        if old_request.status != request.status:
            raise ValueError("You cannot change the status of a request")
        if not self.authz_request_team_member(
            new_request_worker_id=request.worker_id,
            author_id=author_id,
            team_id=request.team_id,
            team_role=team_role,
            old_request_worker_id=old_request.worker_id,
        ):
            raise ValueError(
                "You are not allowed to create a request for another worker"
            )
        request.created_at = old_request.created_at
        new_request = self.collection.request_db.update_request(request)
        return self._to_request_augmented(new_request)

    def approve_request(
        self, request_id: str
    ) -> tuple[RequestAugmented, List[Assignment]]:
        request = self.collection.request_db.get_request_by_id(request_id=request_id)
        if not request:
            raise ValueError(f"Request with id {request_id} not found")
        if request.status != RequestStatus.PENDING:
            raise ValueError(f"Request with id {request_id} is not in pending status")
        request_aug = self._to_request_augmented(request)
        if not request_aug.active:
            raise ValueError(
                f"Request with id {request_id} is not active and cannot be approved"
            )
        # If this is a single-shift request (leave with shift_id OR work_demand
        # with exactly one shift option pointing to a SHIFT), create fixed
        # assignments for the request period and mark fulfillment as fulfilled.
        single_shift_request = (
            request.request_type == RequestType.LEAVE and request.shift_id is not None
        ) or (
            request.request_type == RequestType.WORK_DEMAND
            and len(request.shift_options) == 1
            and request.shift_options[0].id_type == SWOIdTypes.SHIFT
        )
        assignments_created: List[Assignment] = []
        if single_shift_request:
            target_shift_id = (
                request.shift_id
                if request.request_type == RequestType.LEAVE
                and request.shift_id is not None
                else request.shift_options[0].id
            )
            # create fixed assignments for the whole request period and collect
            # created assignments
            assignments_created = self._create_assignments_for_single_shift_request(
                request, target_shift_id
            )
            request.fulfillment = FulfillmentStatus.FULFILLED
        request.status = RequestStatus.APPROVED
        updated_request = self.collection.request_db.update_request(request)
        # Notify the worker
        self.notification_service.notify_request_status_changed(updated_request)
        return self._to_request_augmented(updated_request), assignments_created

    def _create_assignments_for_single_shift_request(
        self, request: Request, target_shift_id: str
    ) -> List[Assignment]:
        """
        Create assignments for each date in the request for a single-shift
        request (leave or work demand).
        """
        dates = [
            request.start_date + timedelta(days=i)
            for i in range((request.end_date - request.start_date).days + 1)
        ]
        created_assignments: List[Assignment] = []
        for date in dates:
            # Create an assignment for each date in the range
            if date < datetime.now(tz=timezone.utc).date():
                continue
            # fmt: off
            assignment_existing = self.collection.assignment_db\
                .get_assignment_by_worker_shift_team_and_date(
                    worker_id=request.worker_id,
                    shift_id=target_shift_id,
                    team_id=request.team_id,
                    a_date=date,
                )
            # fmt: on
            if assignment_existing:
                assignment_existing.source = AssignmentSource.REQUEST
                assignment_existing.source_id = request.id
                self.collection.assignment_db.update_assignment(
                    assignment=assignment_existing
                )
            else:
                assignment_new = Assignment(
                    id="",
                    team_id=request.team_id,
                    schedule_id=None,
                    worker_id=request.worker_id,
                    date=date,
                    shift_id=target_shift_id,
                    fixed=True,
                    source=AssignmentSource.REQUEST,
                    source_id=request.id,
                    reference_assignment_id=None,
                )
                ar_result = self.assignment_service.create_assignment_and_recurrence(
                    assignment_new=assignment_new, recurrence_new=None
                )
                created_assignments.extend(ar_result.assignments_created)
        return created_assignments

    def deny_request(self, request_id: str) -> RequestAugmented:
        request = self.collection.request_db.get_request_by_id(request_id=request_id)
        if not request:
            raise ValueError(f"Request with id {request_id} not found")
        if request.status != RequestStatus.PENDING:
            raise ValueError(f"Request with id {request_id} is not in pending status")
        request.status = RequestStatus.DENIED
        request.fulfillment = FulfillmentStatus.UNFULFILLED
        updated_request = self.collection.request_db.update_request(request)
        # Notify the worker
        self.notification_service.notify_request_status_changed(updated_request)
        return self._to_request_augmented(updated_request)

    def rescind_request(self, request_id: str) -> tuple[RequestAugmented, List[str]]:
        request = self.collection.request_db.get_request_by_id(request_id=request_id)
        if not request:
            raise ValueError(f"Request with id {request_id} not found")
        if request.status == RequestStatus.PENDING:
            raise ValueError(
                f"Request with id {request_id} is already in pending status"
            )
        # Delete any assignments that were created for this request and collect ids
        deleted_ids: List[str] = (
            self.collection.assignment_db.delete_assignments_by_source_id(
                source_id=request_id
            )
        )

        # Update request status back to pending
        request.status = RequestStatus.PENDING
        request.fulfillment = FulfillmentStatus.NOT_PROCESSED
        updated_request = self.collection.request_db.update_request(request)
        return self._to_request_augmented(updated_request), deleted_ids

    def delete_request(self, request_id: str, author_id: str, team_role: str) -> None:
        request = self.collection.request_db.get_request_by_id(request_id=request_id)
        if not request:
            raise ValueError(f"Request with id {request_id} not found")
        if not self.authz_request_team_member(
            new_request_worker_id=request.worker_id,
            author_id=author_id,
            team_id=request.team_id,
            team_role=team_role,
        ):
            raise ValueError(
                "You are not allowed to delete a request for another worker"
            )
        self.collection.request_db.delete_request(request_id)

    # pylint: disable=too-many-arguments
    def authz_request_team_member(
        self,
        new_request_worker_id: str,
        author_id: str,
        team_id: str,
        team_role: str,
        old_request_worker_id: str | None = None,
    ) -> bool:
        if team_role == "member":
            workers = self.collection.worker_db.get_workers_by_team_and_user(
                team_id=team_id, user_id=author_id
            )
            worker_ids = [w.id for w in workers]
            if new_request_worker_id not in worker_ids:
                return False
            if old_request_worker_id:
                if old_request_worker_id not in worker_ids:
                    return False
        return True

    def _to_request_augmented(self, request: Request) -> RequestAugmented:
        """
        Convert a Request object to a RequestAugmented object, fetching all
        related entities as needed.
        """
        worker = self.collection.worker_db.get_worker_by_id(request.worker_id)
        shifts = self.collection.shift_db.get_shifts(request.team_id)
        dimensions: List[Dimension] = []
        dim_entries: List[DimEntry] = []
        attributes: List[Attribute] = []
        if request.request_type == RequestType.WORK_DEMAND:
            dimensions = self.collection.dimension_db.get_dimensions(request.team_id)
            dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
                [d.id for d in dimensions]
            )
            attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
                [s.id for s in shifts]
            )

        return r_to_r_augmented(
            request=request,
            worker=worker,
            shifts=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
        )

    def _to_requests_augmented(
        self, requests: List[Request], team_id: str | None = None
    ) -> List[RequestAugmented]:
        """
        Convert a list of Request objects to RequestAugmented objects
        efficiently by batch-fetching related entities.
        Args:
            requests: List of Request objects to convert
            team_id: Optional team_id. If not provided, will be extracted from
            the first request
        Returns:
            List of RequestAugmented objects
        """
        if not requests:
            return []
        # Get team_id from first request if not provided
        if not team_id:
            team_id = requests[0].team_id
        # Batch fetch all needed entities
        workers = {
            w.id: w for w in self.collection.worker_db.get_workers(team_id=team_id)
        }
        shifts = self.collection.shift_db.get_shifts(team_id=team_id)
        # For leave requests, we need additional data
        has_leave_requests = any(
            r.request_type == RequestType.WORK_DEMAND for r in requests
        )
        dimensions: List[Dimension] = []
        dim_entries: List[DimEntry] = []
        attributes: List[Attribute] = []
        if has_leave_requests:
            dimensions = self.collection.dimension_db.get_dimensions(team_id)
            dim_entries = self.collection.dim_entry_db.get_dim_entries_by_dim_ids(
                [d.id for d in dimensions]
            )
            attributes = self.collection.attribute_db.get_attributes_by_owner_ids(
                [s.id for s in shifts]
            )
        # Convert each request to augmented form
        result: List[RequestAugmented] = []
        for request in requests:
            worker = workers.get(request.worker_id)
            result.append(
                r_to_r_augmented(
                    request=request,
                    worker=worker,
                    shifts=shifts,
                    dimensions=(
                        dimensions
                        if request.request_type == RequestType.WORK_DEMAND
                        else []
                    ),
                    dim_entries=(
                        dim_entries
                        if request.request_type == RequestType.WORK_DEMAND
                        else []
                    ),
                    attributes=(
                        attributes
                        if request.request_type == RequestType.WORK_DEMAND
                        else []
                    ),
                )
            )
        return result
