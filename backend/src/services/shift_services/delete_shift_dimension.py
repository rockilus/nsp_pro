from scripts.setup_database import shift_dimension_db, shift_property_db


def delete_shift_dimension(sd_id: str) -> None:
    shift_property_db.delete_shift_properties_by_shift_dimension_id(sd_id)
    shift_dimension_db.delete_shift_dimension(sd_id)
