from core import ConstraintBuild, ConstraintBuildAugmented
from scripts.setup_database import constraint_build_db, schedule_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def create_constraint_build(
    cb_data: ConstraintBuild,
) -> ConstraintBuildAugmented:
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    schedule_wip = schedule_db.get_schedule_wip(cb_data.team_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.append(constraint_build.id)
        schedule_db.update_schedule(schedule_wip)
    return cb_to_cb_augmented(constraint_build)
