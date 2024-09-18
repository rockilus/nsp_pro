# pylint: disable=R0801
from core import WorkerProperty
from scripts.setup_database import worker_property_db


def create_or_update_worker_property(
    worker_property: WorkerProperty,
) -> WorkerProperty:
    if worker_property.id == "":
        new_sp = worker_property_db.create_worker_property(worker_property)
    else:
        new_sp = worker_property_db.update_worker_property(worker_property)
    return new_sp
