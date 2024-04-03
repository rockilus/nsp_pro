from scripts.setup_database import (
    constraint_build_db,
    shift_dimension_db,
    shift_property_db,
)
from services.constraint_build_services.delete_constraint_build_item import (
    delete_item_with_id_from_constraint_build,
)


def delete_shift_dimension(sd_id: str) -> None:
    delete_shift_dimension_from_constraint_build(sd_id)
    shift_property_db.delete_shift_properties_by_shift_dimension_id(sd_id)
    shift_dimension_db.delete_shift_dimension(sd_id)


def delete_shift_dimension_from_constraint_build(sd_id: str) -> None:
    cbs = constraint_build_db.get_constraint_builds_by_shift_dimension_id(sd_id)
    delete_item_with_id_from_constraint_build(sd_id, cbs, "shift")
