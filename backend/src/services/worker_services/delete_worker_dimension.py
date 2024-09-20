from scripts.setup_database import worker_dimension_db, worker_property_db


def delete_worker_dimension(wd_id: str) -> None:
    worker_property_db.delete_worker_properties_by_worker_dimension_id(wd_id)
    worker_dimension_db.delete_worker_dimension(wd_id)
