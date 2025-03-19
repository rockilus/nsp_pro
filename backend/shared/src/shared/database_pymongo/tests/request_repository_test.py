from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.request import RequestRepository
from shared.database_pymongo.schemas.request import RequestSchema
from shared.schemas.schemas.request import Request, RequestStatus


# pylint: disable=R0801
class TestRequestRepository:
    repo: RequestRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = RequestRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_request(self):
        """Test creating a request."""
        request = Request(
            id=None,
            team_id=str(ObjectId()),
            worker_id=str(ObjectId()),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
            shift_id=str(ObjectId()),
            negative=False,
            hard=True,
            status=RequestStatus.PENDING,
        )

        result = self.repo.create_request(request)

        assert result.id is not None
        assert result.team_id == request.team_id
        assert result.worker_id == request.worker_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == ObjectId(request.team_id)
        assert saved_doc["worker"] == ObjectId(request.worker_id)

    def test_get_request_by_id(self):
        """Test getting a request by ID."""
        request = RequestSchema(
            team=ObjectId(),
            worker=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
        )
        created = self.repo.create(request)

        found = self.repo.get_request_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_id == str(request.team)

    def test_update_request(self):
        """Test updating a request."""
        request = RequestSchema(
            team=ObjectId(),
            worker=ObjectId(),
            start_date=datetime(2023, 1, 1, 0, 0, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, 0, 0, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
        )
        created = self.repo.create(request)

        updated_request = Request(
            id=created.id,
            team_id=str(ObjectId()),
            worker_id=str(ObjectId()),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
            shift_id=str(ObjectId()),
            negative=True,
            hard=False,
            status=RequestStatus.APPROVED,
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
            team=ObjectId(),
            worker=ObjectId(),
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            negative=False,
            hard=True,
            status=RequestStatus.PENDING.value,
        )
        created = self.repo.create(request)

        self.repo.delete_request(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_requests(self):
        """Test getting requests for workers."""
        requests = [
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
        ]
        self.repo.create_many(requests)

        found_requests = self.repo.get_requests([str(r.worker) for r in requests])
        assert len(found_requests) == 2

    def test_get_requests_by_dates(self):
        """Test getting requests by date range."""
        requests = [
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
        ]
        self.repo.create_many(requests)

        found_requests = self.repo.get_requests_by_dates(
            datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            datetime(2023, 1, 4, tzinfo=timezone.utc).date(),
            [str(r.worker) for r in requests],
        )
        assert len(found_requests) == 2

    def test_update_requests(self):
        """Test updating multiple requests."""
        requests = [
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
        ]
        created_requests = self.repo.create_many(requests)

        updated_requests = [
            Request(
                id=created_requests[0].id,
                team_id=str(ObjectId()),
                worker_id=str(ObjectId()),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
                end_date=datetime(2023, 1, 3, tzinfo=timezone.utc).date(),
                shift_id=str(ObjectId()),
                negative=True,
                hard=False,
                status=RequestStatus.APPROVED,
            ),
            Request(
                id=created_requests[1].id,
                team_id=str(ObjectId()),
                worker_id=str(ObjectId()),
                start_date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).date(),
                shift_id=str(ObjectId()),
                negative=True,
                hard=False,
                status=RequestStatus.APPROVED,
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
        worker_oid = ObjectId()
        requests = [
            RequestSchema(
                team=ObjectId(),
                worker=worker_oid,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
            RequestSchema(
                team=ObjectId(),
                worker=worker_oid,
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
        ]
        self.repo.create_many(requests)

        self.repo.delete_requests_by_worker_id(str(worker_oid))

        assert self.repo.collection.count_documents({"worker": worker_oid}) == 0

    def test_delete_requests_by_shift_id(self):
        """Test deleting requests by shift ID."""
        shift_oid = ObjectId()
        requests = [
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=shift_oid,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
            RequestSchema(
                team=ObjectId(),
                worker=ObjectId(),
                start_date=datetime(2023, 1, 3, tzinfo=timezone.utc).timestamp(),
                end_date=datetime(2023, 1, 4, tzinfo=timezone.utc).timestamp(),
                shift=shift_oid,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING.value,
            ),
        ]
        self.repo.create_many(requests)

        self.repo.delete_requests_by_shift_id(str(shift_oid))

        assert self.repo.collection.count_documents({"shift": shift_oid}) == 0
