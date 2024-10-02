from typing import List

from core import ConstraintBuildAugmented
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def get_constraint_builds(team_id: str) -> List[ConstraintBuildAugmented]:
    constraint_builds = constraint_build_db.get_constraint_builds(team_id)
    return [cb_to_cb_augmented(cb) for cb in constraint_builds]


def get_active_constraint_builds_by_ids(
    constraint_build_ids: List[str],
) -> List[ConstraintBuildAugmented]:
    constraint_builds = constraint_build_db.get_constraint_builds_by_ids(
        constraint_build_ids
    )
    cbs_augmented = [cb_to_cb_augmented(cb) for cb in constraint_builds]
    return [cb for cb in cbs_augmented if cb.active]
