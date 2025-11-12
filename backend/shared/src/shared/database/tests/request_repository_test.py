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

    def test_get_requests_by_dates_overlap_period(self):
        """Requests overlapping the queried period should be returned.

        Scenarios included:
        - request fully inside the period
        - request starting before and ending inside the period
        - request starting before and ending after the period
        - requests fully outside the period should NOT be returned
        """
        # period to query: 2026-01-01 -> 2026-01-31
        ts_q_start = datetime(2026, 1, 1, tzinfo=timezone.utc).date()
        ts_q_end = datetime(2026, 1, 31, tzinfo=timezone.utc).date()

        requests = [
            # fully inside (10 Jan)
            RequestSchema(
                team="team1",
                worker="workerA",
                start_date=datetime(2026, 1, 10, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2026, 1, 10, tzinfo=timezone.utc).timestamp(),
                shift="s1",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="inside",
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # starts before, ends inside (15 Dec 2025 - 15 Jan 2026)
            RequestSchema(
                team="team1",
                worker="workerB",
                start_date=datetime(2025, 12, 15, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2026, 1, 15, tzinfo=timezone.utc).timestamp(),
                shift="s2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="overlap_end",
                created_at=datetime(2025, 12, 15, tzinfo=timezone.utc).timestamp(),
            ),
            # starts before, ends after (15 Dec 2025 - 15 Feb 2026)
            RequestSchema(
                team="team1",
                worker="workerC",
                start_date=datetime(2025, 12, 15, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2026, 2, 15, tzinfo=timezone.utc).timestamp(),
                shift="s3",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="span",
                created_at=datetime(2025, 12, 15, tzinfo=timezone.utc).timestamp(),
            ),
            # fully before (should not be returned)
            RequestSchema(
                team="team1",
                worker="workerD",
                start_date=datetime(2025, 11, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2025, 11, 30, tzinfo=timezone.utc).timestamp(),
                shift="s4",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="before",
                created_at=datetime(2025, 11, 1, tzinfo=timezone.utc).timestamp(),
            ),
            # fully after (should not be returned)
            RequestSchema(
                team="team1",
                worker="workerE",
                start_date=datetime(2026, 2, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2026, 2, 5, tzinfo=timezone.utc).timestamp(),
                shift="s5",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="after",
                created_at=datetime(2026, 2, 1, tzinfo=timezone.utc).timestamp(),
            ),
        ]

        self.repo.create_many(requests)

        found_requests = self.repo.get_requests_by_dates(
            ts_q_start,
            ts_q_end,
            ["workerA", "workerB", "workerC", "workerD", "workerE"],
        )

        # Only the first three should overlap the month of January 2026
        assert len(found_requests) == 3
        returned_workers = {r.worker_id for r in found_requests}
        assert returned_workers == {"workerA", "workerB", "workerC"}

    def test_get_requests_by_dates_with_type_and_status(self):
        """Test getting requests by date range filtered by type and status."""

        ts_start = datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp()
        ts_end = datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp()
        ts_created = datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp()

        requests = [
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=ts_start,
                end_date=ts_end,
                shift="shift1",
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
                comment="test comment",
                created_at=ts_created,
            ),
            RequestSchema(
                team="team1",
                worker="worker1",
                start_date=ts_start,
                end_date=ts_end,
                shift="shift2",
                shift_options=[],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
                request_type=RequestType.LEAVE.value,
                fulfillment=FulfillmentStatus.NOT_PROCESSED.value,
                comment="test comment",
                created_at=ts_created,
            ),
            RequestSchema(
                team="team1",
                worker="worker2",
                start_date=ts_start,
                end_date=ts_end,
                shift="shift3",
                shift_options=[
                    ShiftWorkerOptionSchema(
                        name="shift3",
                        id="shift3",
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
                comment="test comment",
                created_at=ts_created,
            ),
        ]

        self.repo.create_many(requests)

        found_requests = self.repo.get_requests_by_dates(
            datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            datetime(2023, 1, 4, tzinfo=timezone.utc).date(),
            ["worker1", "worker2"],
            request_type=RequestType.WORK_DEMAND,
            status=RequestStatus.APPROVED,
        )

        # Only the two WORK_DEMAND + APPROVED documents should be returned
        assert len(found_requests) == 2
        for r in found_requests:
            assert r.request_type == RequestType.WORK_DEMAND
            assert r.status == RequestStatus.APPROVED

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
