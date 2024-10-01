from scripts.setup_database import dim_entry_db, dimension_db, shift_property_db


def delete_dimension(sd_id: str) -> None:
    dim_entries = dim_entry_db.get_dim_entries_by_dim_id(sd_id)
    for de in dim_entries:
        dim_entry_db.logical_delete_dim_entry(de.id)
    shift_property_db.delete_shift_properties_by_dimension_id(sd_id)
    dimension_db.logical_delete_dimension(sd_id)
