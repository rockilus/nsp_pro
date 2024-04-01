from scripts.setup_database import constraint_build_db, constraint_db


def delete_constraint_build_and_dependencies(cb_id: str) -> None:
    constraint_db.delete_constraints_by_constraint_build_id(cb_id)
    constraint_build_db.delete_constraint_build(cb_id)
