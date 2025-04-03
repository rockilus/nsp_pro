from typing import List

from shared.schemas import Request, RequestAugmented, Shift, Worker

from src.services.base_service import BaseService


class RequestService(BaseService):
    def create_request(self, r_data: Request) -> RequestAugmented:
        new_request = self.collection.request_db.create_request(r_data)
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
    def update_request(self, r_data: Request) -> RequestAugmented:
        new_request = self.collection.request_db.update_request(r_data)
        worker = self.collection.worker_db.get_worker_by_id(new_request.worker_id)
        shift = self.collection.shift_db.get_shift_by_id(new_request.shift_id)
        return self.r_to_r_augmented(new_request, worker, shift)

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
