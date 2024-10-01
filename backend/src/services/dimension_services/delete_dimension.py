from scripts.setup_database import dim_entry_db, dimension_db
from services.dimension_services.delete_dim_entry import delete_dim_entry


def delete_dimension(sd_id: str) -> None:
    dim_entries = dim_entry_db.get_dim_entries_by_dim_id(sd_id)
    for de in dim_entries:
        delete_dim_entry(de.id)
    dimension_db.logical_delete_dimension(sd_id)
