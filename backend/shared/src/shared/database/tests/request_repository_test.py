from datetime import datetime, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.request import RequestRepository
from shared.database.schemas.constraint_build import ShiftWorkerOptionSchema
from shared.database.schemas.request import RequestSchema
from shared.schemas.core.constraint import SWOIdTypes
from shared.schemas.core.request import (
    FulfillmentStatus,
    Request,
    RequestStatus,
    RequestType,
)


# pylint: disable=R0801
class TestRequestRepository:
    repo: RequestRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = RequestRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("requests")  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_request(self):
        """Test creating a request."""
        request = Request(
            id=None,
            team_id="team1",
            worker_id="worker1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
            shift_id="shift1",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.PENDING,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="test comment",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        )

        result = self.repo.create_request(request)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.worker_id == "worker1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["worker"] == "worker1"

    def test_get_request_by_id(self):
        """Test getting a request by ID."""
        request = RequestSchema(
            team="team1",
            worker="worker1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
            request_type=RequestType.LEAVE.value,
            fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
            comment="test comment",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(request)

        found = self.repo.get_request_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_request(self):
        """Test updating a request."""
        request = RequestSchema(
            team="team1",
            worker="worker1",
            start_date=datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, 0, 0, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
            request_type=RequestType.LEAVE.value,
            fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
            comment="test comment",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(request)

        updated_request = Request(
            id=created.id,
            team_id="team1",
            worker_id="worker1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
            shift_id="shift1",
            shift_options=[],
            negative=True,
            hard=False,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.FULFILLED,
            comment="updated comment",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
        )

        result = self.repo.update_request(updated_request)

        assert result.end_date == datetime(2023, 1, 3, tzinfo=timezone.utc).date()
        assert result.negative is True
        assert result.status == RequestStatus.APPROVED

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["end_date"] == 1672704000.0
        assert from_db["negative"] is True

    def test_delete_request(self):
        """Test deleting a request."""
        request = RequestSchema(
            team="team1",
            worker="worker1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
            request_type=RequestType.LEAVE.value,
            fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
            comment="test comment",
            created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(request)

        self.repo.delete_request(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_requests(self):
        """Test getting requests for workers."""
        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        found_requests = self.repo.get_requests(["worker1", "worker2"])
        assert len(found_requests) == 2

    def test_get_requests_by_dates(self):
        """Test getting requests by date range."""
        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        found_requests = self.repo.get_requests_by_dates(
            datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            datetime(2023, 1, 4, tzinfo=timezone.utc).date(),
            ["worker1", "worker2"],
        )
        assert len(found_requests) == 2

    def test_update_requests(self):
        """Test updating multiple requests."""
        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        created_requests = self.repo.create_many(requests)

        updated_requests = [
            Request(
                id=created_requests[0].id,
                team_id="team1",
                worker_id="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
                end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
                shift_id="shift1",
                shift_options=[],
                negative=True,
                hard=False,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.FULFILLED,
                comment="updated comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            ),
            Request(
                id=created_requests[1].id,
                team_id="team1",
                worker_id="worker2",
                start_date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).date(),
                shift_id="shift2",
                shift_options=[],
                negative=True,
                hard=False,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.FULFILLED,
                comment="updated comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc),
            ),
        ]

        result = self.repo.update_requests(updated_requests)

        assert len(result) == 2
        assert result[0].end_date == datetime(2023, 1, 3, tzinfo=timezone.utc).date()
        assert result[0].negative is True
        assert result[0].status == RequestStatus.APPROVED
        assert result[1].end_date == datetime(2023, 1, 4, tzinfo=timezone.utc).date()
        assert result[1].negative is True
        assert result[1].status == RequestStatus.APPROVED

    def test_delete_requests_by_worker_id(self):
        """Test deleting requests by worker ID."""
        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        self.repo.delete_requests_by_worker_id("worker1")

        assert self.repo.collection.count_documents({"worker": "worker1"}) == 0

    def test_delete_requests_by_shift_id(self):
        """Test deleting requests by shift ID."""
        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        self.repo.delete_requests_by_shift_id("shift1")

        assert self.repo.collection.count_documents({"shift": "shift1"}) == 0

    def test_get_approved_work_demand_requests_by_dates(self):
        """Test getting approved work demand requests with NOT_PROCESSED
        fulfillment by date range and worker ids."""
        # Insert various requests
        requests = [
            # Should match: work_demand, approved, not_processed, worker1
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift1",
                        id="shift1",
                        id_type=SWOIdTypes.SHIFT.value,
                        is_bool_dim=False,
                        category_name="category1",
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="should match",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong status
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift1",
                        id="shift1",
                        id_type=SWOIdTypes.SHIFT.value,
                        is_bool_dim=False,
                        category_name="category1",
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="wrong status",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong fulfillment
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift1",
                        id="shift1",
                        id_type=SWOIdTypes.SHIFT.value,
                        is_bool_dim=False,
                        category_name="category1",
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="wrong fulfillment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong type
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="wrong type",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: out of date range
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2022, 12, 30, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2022, 12, 31, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift1",
                        id="shift1",
                        id_type=SWOIdTypes.SHIFT.value,
                        is_bool_dim=False,
                        category_name="category1",
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="out of range",
                created_at=datetime(2022, 12, 30, tzinfo=timezone.utc).timestamp(),
            ),
            # Should match: work_demand, approved, not_processed, worker2
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift1",
                        id="shift1",
                        id_type=SWOIdTypes.SHIFT.value,
                        is_bool_dim=False,
                        category_name="category1",
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="should match 2",
                created_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        found = self.repo.get_approved_work_demand_requests_by_dates(
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
            worker_ids=["worker1", "worker2"],
        )
        found_ids = {r.worker_id for r in found}
        found_comments = {r.comment for r in found}

        assert len(found) == 3  # 2 if we exclude fulfilled
        assert "worker1" in found_ids
        assert "worker2" in found_ids
        assert "should match" in found_comments
        assert "should match 2" in found_comments

    def test_get_approved_fulfilled_leave_requests_by_dates(self):
        """
        Test getting approved leave requests with FULFILLED fulfillment by date
        range and worker ids.
        """
        # Insert various requests
        requests = [
            # Should match: leave, approved, fulfilled, worker1
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="should match",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong status
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="wrong status",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong fulfillment
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="wrong fulfillment",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: wrong type
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=None,
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.WORK_DEMAND.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="wrong type",
                created_at=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # Should not match: out of date range
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=datetime(2022, 12, 30, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2022, 12, 31, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="out of range",
                created_at=datetime(2022, 12, 30, tzinfo=timezone.utc).timestamp(),
            ),
            # Should match: leave, approved, fulfilled, worker2
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.FULFILLED.value,
                comment="should match 2",
                created_at=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(requests)

        found = self.repo.get_approved_fulfilled_leave_requests_by_dates(
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
            worker_ids=["worker1", "worker2"],
        )
        found_ids = {r.worker_id for r in found}
        found_comments = {r.comment for r in found}

        assert len(found) == 2
        assert "worker1" in found_ids
        assert "worker2" in found_ids
        assert "should match" in found_comments
        assert "should match 2" in found_comments
