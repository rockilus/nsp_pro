from core import ConstraintBuild
from scripts.setup_database import constraint_build_db, schedule_db
from services.constraint_build_services.blocks_to_string import blocks_to_string


def create_constraint_build(
    cb_data: ConstraintBuild,
) -> ConstraintBuild:
    cb_data.text = blocks_to_string(cb_data.blocks, cb_data.language)
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    schedule_wip = schedule_db.get_schedule_wip(cb_data.team_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.append(constraint_build.id)
        schedule_db.update_schedule(schedule_wip)
    return constraint_build
