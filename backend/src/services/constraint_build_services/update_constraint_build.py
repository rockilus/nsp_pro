# pylint: disable=R0801
from core import ConstraintBuild, ConstraintBuildAugmented
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def update_constraint_build(
    new_cb: ConstraintBuild,
) -> ConstraintBuildAugmented:
    constraint_build = constraint_build_db.update_constraint_build(new_cb)
    return cb_to_cb_augmented(constraint_build)
