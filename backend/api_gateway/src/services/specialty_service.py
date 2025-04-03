from typing import List, Tuple

from shared.schemas import Attribute, Worker

from src.services.base_service import BaseService


# pylint: disable=too-few-public-methods
class SpecialtyService(BaseService):
    def delete_specialty(
        self, specialty_id: str
    ) -> Tuple[List[Worker], List[List[Attribute]]]:
        w_with_specialty = self.collection.worker_db.get_workers_by_specialty_id(
            specialty_id
        )
        updated_workers: List[Worker] = []
        for w in w_with_specialty:
            w.specialty_ids.remove(specialty_id)
            updated_workers.append(w)
        workers_saved = self.collection.worker_db.update_workers(updated_workers)
        self.collection.specialty_db.logical_delete_specialty(specialty_id)
        attributes_w_saved = [
            self.collection.attribute_db.get_attributes_by_owner_id(w.id)
            for w in workers_saved
        ]
        return workers_saved, attributes_w_saved
