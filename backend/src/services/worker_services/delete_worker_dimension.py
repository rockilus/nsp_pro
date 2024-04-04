from scripts.setup_database import (
    constraint_build_db,
    worker_dimension_db,
    worker_property_db,
)
from services.constraint_build_services.delete_constraint_build_item import (
    delete_item_with_id_from_constraint_build,
)


def delete_worker_dimension(wd_id: str) -> None:
    delete_worker_dimension_from_constraint_build(wd_id)
    worker_property_db.delete_worker_properties_by_worker_dimension_id(wd_id)
    worker_dimension_db.delete_worker_dimension(wd_id)


def delete_worker_dimension_from_constraint_build(wd_id: str) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_worker_dimension_id(wd_id)
    delete_item_with_id_from_constraint_build(wd_id, cbs, ["worker"])
