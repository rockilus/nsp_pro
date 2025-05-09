from typing import List

from shared.schemas.core import Request, RequestAugmented, Shift, Worker

from src.services.base_service import BaseService


class RequestService(BaseService):
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
        new_request = self.collection.request_db.create_request(request)
        worker = self.collection.worker_db.get_worker_by_id(new_request.worker_id)
        shift = self.collection.shift_db.get_shift_by_id(new_request.shift_id)
        return self.r_to_r_augmented(new_request, worker, shift)

    def get_requests(self, team_id: str) -> List[RequestAugmented]:
        workers = self.collection.worker_db.get_workers(team_id)
        shifts = self.collection.shift_db.get_shifts(team_id)
        requests = self.collection.request_db.get_requests([w.id for w in workers])
        rs_augmented = []
        for r in requests:
            worker = next((w for w in workers if w.id == r.worker_id), None)
            shift = next((s for s in shifts if s.id == r.shift_id), None)
            rs_augmented.append(self.r_to_r_augmented(r, worker, shift))
        return rs_augmented

    def get_requests_by_workers(self, workers: List[Worker]) -> List[RequestAugmented]:
        shifts = self.collection.shift_db.get_shifts(workers[0].team_id)
        requests = self.collection.request_db.get_requests([w.id for w in workers])
        rs_augmented = []
        for r in requests:
            worker = next((w for w in workers if w.id == r.worker_id), None)
            shift = next((s for s in shifts if s.id == r.shift_id), None)
            rs_augmented.append(self.r_to_r_augmented(r, worker, shift))
        return rs_augmented

    # pylint: disable=R0801
    def update_request(
        self, request: Request, author_id: str, team_role: str
    ) -> RequestAugmented:
        old_request = self.collection.request_db.get_request_by_id(
            request_id=request.id
        )
        if not old_request:
            raise ValueError(f"Request with id {request.id} not found")
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
        new_request = self.collection.request_db.update_request(request)
        worker = self.collection.worker_db.get_worker_by_id(new_request.worker_id)
        shift = self.collection.shift_db.get_shift_by_id(new_request.shift_id)
        return self.r_to_r_augmented(new_request, worker, shift)

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

    @staticmethod
    def r_to_r_augmented(
        request: Request, worker: Worker | None, shift: Shift | None
    ) -> RequestAugmented:
        active = (not worker.deleted if worker else False) and (
            not shift.deleted if shift else False
        )
        return RequestAugmented(
            id=request.id,
            team_id=request.team_id,
            worker_id=request.worker_id,
            start_date=request.start_date,
            end_date=request.end_date,
            shift_id=request.shift_id,
            negative=request.negative,
            hard=request.hard,
            status=request.status,
            active=active,
        )
