from typing import List

from core.constraint import Template, TemplateBlock
from scripts.setup_database import (
    shift_db,
    shift_dimension_db,
    worker_db,
    worker_dimension_db,
)
from utils.constants import Constants


def build_templates() -> List[Template]:
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
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type="seq",
            text="John should work at most 2 consecutive days off",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="list",
                    options=worker_names,
                    placeholder="John",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="should work",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="at most",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["consecutive"],
                    placeholder="consecutive",
                ),
                TemplateBlock(
                    name="shift",
                    type="list",
                    options=shift_names,
                    placeholder="days off",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type="sum",
            text="John should work at least 1 shift off per week",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="list",
                    options=worker_names,
                    placeholder="John",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="should work",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="at most",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="shift",
                    type="list",
                    options=shift_names,
                    placeholder="days off",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["per week", "per month", "per year"],
                    placeholder="per week",
                ),
            ],
        ),
        Template(
            id="2",
            constraint_type="ord",
            text="No shift night 1 day after afternoon for John",
            blocks=[
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["no"],
                    placeholder="no",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="list",
                    options=shift_names,
                    placeholder="shift night",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="day",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="after",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="list",
                    options=shift_names,
                    placeholder="afternoon",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="for",
                ),
                TemplateBlock(
                    name="worker",
                    type="list",
                    options=worker_names,
                    placeholder="John",
                ),
            ],
        ),
        # "If shift night, then off next day for John"
        # "If shift night, then off 2 days after for John"
        Template(
            id="3",
            constraint_type="ord",
            text="If shift night, then off 1 day after for John",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="if",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="list",
                    options=shift_names,
                    placeholder="shift night",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="then",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="list",
                    options=shift_names,
                    placeholder="off",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=1,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="day",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="after",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="for",
                ),
                TemplateBlock(
                    name="worker",
                    type="list",
                    options=worker_names,
                    placeholder="John",
                ),
            ],
        ),
        # "If morning on saturday, then off 2 days afer for John"
        Template(
            id="4",
            constraint_type="ord",
            text="If morning on saturday, then off 2 days afer for John",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="if",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="list",
                    options=shift_names,
                    placeholder="shift night",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="on",
                ),
                TemplateBlock(
                    name="weekday",
                    type="string",
                    options=list(Constants.WEEK_DAYS),
                    placeholder="monday",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="then",
                ),
                TemplateBlock(
                    name="shift_relative",
                    type="list",
                    options=shift_names,
                    placeholder="off",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="day",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["after", "before"],
                    placeholder="after",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="for",
                ),
                TemplateBlock(
                    name="worker",
                    type="list",
                    options=worker_names,
                    placeholder="John",
                ),
            ],
        ),
    ]
