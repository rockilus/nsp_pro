from scripts.setup_database import dimension_db


def delete_dimension(sd_id: str) -> None:
    dimension_db.logical_delete_dimension(sd_id)
    # shift_property_db.delete_shift_properties_by_shift_dimension_id(sd_id)
