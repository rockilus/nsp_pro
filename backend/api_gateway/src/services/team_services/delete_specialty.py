from typing import List

from shared.schemas import Worker

from src.scripts.setup_database import specialty_db, worker_db


def delete_specialty(specialty_id: str) -> List[Worker]:
    w_with_specialty = worker_db.get_workers_by_specialty_id(specialty_id)
    updated_workers: List[Worker] = []
    for w in w_with_specialty:
        w.specialty_ids.remove(specialty_id)
        updated_workers.append(w)
    workers_saved = worker_db.update_workers(updated_workers)
    specialty_db.logical_delete_specialty(specialty_id)
    return workers_saved
