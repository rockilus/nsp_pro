from typing import List, Tuple

from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    DimensionEntryType,
    DimensionType,
    Worker,
)

from src.services.base_service import BaseService
from src.utils.string_utils import generate_acronym


class WorkerService(BaseService):
    def create_worker(self, worker: Worker) -> Tuple[Worker, List[Attribute]]:
        worker_created = self.collection.worker_db.create_worker(worker)
        d_bool = (
            self.collection.dimension_db.get_dimensions_by_dim_types_and_entry_type(
                [DimensionType.WORKER],
                DimensionEntryType.BOOL,
                worker_created.team_id,
            )
        )
        attributes: List[Attribute] = []
        attributes_saved: List[Attribute] = []
        for d in d_bool:
            # pylint: disable=R0801
            attributes.append(
                Attribute(
                    id="",
                    value=False,
                    owner_type=AttributeOwnerType.WORKER,
                    owner_id=worker_created.id,
                    dimension_id=d.id,
                    dim_entry_ids=[],
                )
            )
        attributes_saved = self.collection.attribute_db.create_attributes(attributes)
        return worker_created, attributes_saved

    def update_worker(self, worker_updated: Worker) -> Worker:
        worker_exsiting = self.collection.worker_db.get_worker_by_id(worker_updated.id)
        if not worker_exsiting:
            raise ValueError(f"Worker with id {worker_updated.id} not found")
        if worker_updated.acronym != worker_exsiting.acronym:
            worker_updated.acronym_custom = True
        if (
            worker_updated.name != worker_exsiting.name
            and not worker_updated.acronym_custom
        ):
            workers = self.collection.worker_db.get_workers_not_deleted(
                worker_updated.team_id
            )
            acronyms = [w.acronym for w in workers if w.id != worker_updated.id]
            worker_updated.acronym = generate_acronym(worker_updated.name, acronyms)
        worker_saved = self.collection.worker_db.update_worker(worker_updated)
        return worker_saved

    def attach_user_to_worker(
        self, worker_id: str, user_id: str, team_id: str
    ) -> List[Worker]:
        # Validate worker existence and user assignment
        worker = self._get_worker_or_raise(worker_id)
        if worker.user_id and worker.user_id != user_id:
            raise ValueError(f"Worker {worker_id} already has a user assigned")

        # Update other workers in the team
        workers_with_user = self.collection.worker_db.get_workers_by_team_and_user(
            team_id=team_id, user_id=user_id
        )
        workers_to_update = self._detach_user_from_other_workers(
            workers_with_user, worker_id
        )

        # Assign user to the target worker
        worker.user_id = user_id
        workers_to_update.append(worker)

        # Save updates to the database
        return self.collection.worker_db.update_workers(workers_to_update)

    def _get_worker_or_raise(self, worker_id: str) -> Worker:
        worker = self.collection.worker_db.get_worker_by_id(worker_id)
        if not worker:
            raise ValueError(f"Worker with id {worker_id} not found")
        return worker

    @staticmethod
    def _detach_user_from_other_workers(
        workers: List[Worker], target_worker_id: str
    ) -> List[Worker]:
        workers_to_update = []
        for worker in workers:
            if worker.id != target_worker_id:
                worker.user_id = None
                workers_to_update.append(worker)
        return workers_to_update

    def delete_worker(self, worker_id: str) -> None:
        self.delete_worker_from_schedule_quick_staffing(worker_id)
        self.collection.worker_db.logical_delete_worker(worker_id)
        # delete_worker_from_objective_breach(worker_id)
        # assignment_db.delete_assignments_by_worker_id(worker_id)
        # request_db.delete_requests_by_worker_id(worker_id)

    def delete_worker_from_objective_breach(self, worker_id: str) -> None:
        obs = self.collection.breach_db.get_breaches_by_worker_id(worker_id)
        for ob in obs:
            new_vars = [v for v in ob.variables if v.worker_id != worker_id]
            if not new_vars:
                self.collection.breach_db.delete_breach(ob.id)
                continue
            ob.variables = new_vars
            self.collection.breach_db.update_breach(ob)

    def delete_worker_from_schedule_quick_staffing(self, worker_id: str) -> None:
        schedules = (
            self.collection.schedule_db.get_schedule_quick_staffing_contain_worker_id(
                worker_id
            )
        )
        for schedule in schedules:
            new_quick_staffings = [
                qs for qs in schedule.quick_staffings if qs.worker_id != worker_id
            ]
            schedule.quick_staffings = new_quick_staffings
            self.collection.schedule_db.update_schedule(schedule)
