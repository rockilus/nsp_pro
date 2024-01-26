from typing import List

from core.constraint import Template, TemplateBlock
from scripts.setup_database import shift_db, worker_db
from utils.constants import Constants


def build_templates() -> List[Template]:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    return build_templates_list(
        [s.name for s in shifts],
        [w.name for w in workers],
    )


def build_templates_list(
    shift_names: List[str],
    worker_names: List[str],
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


constraints = [
    "At most 2 consecutive days off",
    "Less than 3 consecutive days off",
    "Number of consecutive days off less than or equal to 2",
    "Maximum 2 consecutive days off",
    "John should have at least two days off per week",
    "At least 2 consecutive night shifts",
    "At most 3 consecutive night shifts",
    "At least 1 shift off per week",
    "At least 2 shifts off per week",
    "At most 2 shifts off per week",
    "At least 1 night shift per week",
    "At most 4 night shifts per week",
    "No shift night after afternoon",
    "No shift morning after night",
    "Shift night after afternoon",
    "Shift off after shift duty",
    "Shift off after duty",
    "1 shift off after shift duty",
    "1 day off after a duty",
    "Number of duties on thursdays should be evenly spread across eligible "
    + "workers",
    "Number of duties on thursdays should be evenly spread across surgeons",
    "Number of duties on fridays should be evenly spread across eligible "
    + "workers",
    "Number of duties on saturdays should be evenly spread across eligible "
    + "workers",
    "Number of duties on sunday should be evenly spread across eligible "
    + "workers",
    "Number of duties on bank holidays should be evenly spread across "
    + "eligible workers",
    "Number of duties should be evenly spread across eligible workers",
    "60+ workers should do at most 4 duties per month",
    "60+ workers should not work more than 4 duties per month",
    "60+ workers should only do maternity duties",
    "Over 60 workers should only do maternity duties",
    "Pregnant workers should not do any duties",
    "Pregnant workers should only do consultations and surgeries",
    "Pregnant workers should only do consultations, surgeries and classes",
    "Plouharnel workers should work in Plouharnel only",
    "Vannes workers should work in Vannes only",
    "Number of Plouharnel duty should be evenly spread across workers working "
    + "on both sites",
    "Duties during work week should be spread evenly in time for a worker (not "
    + "all duties grouped)",
    "Duties during weekend should be spread evenly in time for a worker (not "
    + "all duties grouped)",
    "Duty on saturday means off on previous friday",
    "Duty on saturday means off on next monday",
    "Duty on friday means off on previous thursday",
    "Duty on sunday means off on next tuesday",
    "At most 40 hours of work per week",
    "At most 40 hours of work per week",
    "At most 8 hours per day",
    "At most 8 hours of consecutive work",
    "No shift night after shift afternoon within one day",
    "For worker x, no work on wednesday afternoons",
    "Workers working partime and allowed to work in Plouharnel should work at "
    + "least 2 days in Plouharnel",
]
