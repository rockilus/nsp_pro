from shared.augment.r_to_r_augmented import r_to_r_augmented
from shared.schemas import Request, RequestAugmented

from scripts.setup_database import request_db, shift_db, worker_db


# pylint: disable=R0801
def update_request(r_data: Request) -> RequestAugmented:
    new_request = request_db.update_request(r_data)
    worker = worker_db.get_worker_by_id(new_request.worker_id)
    shift = shift_db.get_shift_by_id(new_request.shift_id)
    return r_to_r_augmented(new_request, worker, shift)
