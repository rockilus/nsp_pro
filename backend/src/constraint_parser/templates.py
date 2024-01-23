from typing import List
from scripts.setup_database import (
    shift_db,
    worker_db,
    shift_dimension_db,
    worker_dimension_db,
)
from core.constraint import ConstraintTemplate, ConstraintTemplateBlock


def build_templates() -> List[ConstraintTemplate]:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    shift_dimensions = shift_dimension_db.get_shift_dimensions()
    worker_dimensions = worker_dimension_db.get_worker_dimensions()
    return build_templates_list(
        [s.name for s in shifts],
        [w.name for w in workers],
        [sd.name for sd in shift_dimensions],
        [wd.name for wd in worker_dimensions],
    )


def build_templates_list(
    shift_names: List[str],
    worker_names: List[str],
    shift_dimension_names: List[str],
    worker_dimension_names: List[str],
) -> List[ConstraintTemplate]:
    return [
        ConstraintTemplate(
            id="0",
            constraint_type="seq",
            text="At most 2 consecutive days off",
            blocks=[
                ConstraintTemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="at most",
                    multiple=False,
                ),
                ConstraintTemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                    multiple=False,
                ),
                ConstraintTemplateBlock(
                    name="timing",
                    type="string",
                    options=["consecutive"],
                    placeholder="consecutive",
                    multiple=False,
                ),
                ConstraintTemplateBlock(
                    name="shift",
                    type="list",
                    options=shift_names + shift_dimension_names,
                    placeholder="days off",
                    multiple=True,
                ),
            ],
        )
    ]
