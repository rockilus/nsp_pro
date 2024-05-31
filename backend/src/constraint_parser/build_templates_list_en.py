from typing import Dict, List

from core import Template, TemplateBlock
from utils.constants import Constants


def build_templates_list_en(
    worker_options: Dict, shift_options: Dict
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type="seq",
            text="John should work at most 2 consecutive days off",
            language="en",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
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
                    type="dict",
                    options=shift_options,
                    placeholder="days off",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type="sum",
            text="John should work at least 1 shift off per week",
            language="en",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
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
                    type="dict",
                    options=shift_options,
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
            language="en",
            blocks=[
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["no"],
                    placeholder="no",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=worker_options,
                    placeholder="John",
                ),
            ],
        ),
        Template(
            id="3",
            constraint_type="ord",
            text="If shift night, then off 1 day after for John",
            language="en",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="if",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=worker_options,
                    placeholder="John",
                ),
            ],
        ),
        Template(
            id="4",
            constraint_type="ord",
            text="If morning on saturday, then off 2 days afer for John",
            language="en",
            blocks=[
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="if",
                ),
                TemplateBlock(
                    name="shift_reference",
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=shift_options,
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
                    type="dict",
                    options=worker_options,
                    placeholder="John",
                ),
            ],
        ),
        # Filter
        Template(
            id="5",
            constraint_type="fil",
            text="John should only work night",
            language="en",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="John",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["should only", "should not"],
                    placeholder="should only",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="work",
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="shift night",
                ),
            ],
        ),
        # Evenness
        Template(
            id="6",
            constraint_type="eve",
            text="Duties on sunday should be evenly spread in time for all workers",
            language="en",
            blocks=[
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="Duty",
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
                    placeholder="sunday",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="should be evenly spread in time for",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="John",
                ),
            ],
        ),
        # Fairness
        Template(
            id="7",
            constraint_type="fai",
            text="Duties on sunday should be fairly spread across all workers",
            language="en",
            blocks=[
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="Duty",
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
                    placeholder="sunday",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="should be fairly spread across",
                ),
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="all workers",
                ),
            ],
        ),
    ]


constraints = [
    # Sequence
    "John should work at most 2 consecutive days off",  # OK
    # Sum
    "John should work at least 1 days off per week",  # OK
    # Order
    "No shift night 1 day after afternoon for John",  # OK
    "If shift night, then off 1 day after for John",  # OK
    "If morning on saturday, then off 2 days afer for John",  # OK
    # Filter
    "60+ workers should only do maternity duties",  # OK
    "Over 60 workers should only do maternity duties",  # OK
    "Pregnant workers should not do any duties",  # OK
    "Pregnant workers should only do consultations and surgeries",  # OK
    "Pregnant workers should only do consultations, surgeries and classes",  # OK
    "Plouharnel workers should work in Plouharnel only",  # OK
    "Vannes workers should work in Vannes only",  # OK
    # Evenness
    "Duties during work week should be spread evenly in time for a worker (not "
    + "all duties grouped)",
    "Duties during weekend should be spread evenly in time for a worker (not "
    + "all duties grouped)",
    # Fairness
    "Number of duties on thursdays should be evenly spread across eligible "
    + "workers",
    "Number of duties on thursdays should be evenly spread across surgeons",
    "Number of duties on fridays should be evenly spread across eligible " + "workers",
    "Number of duties on saturdays should be evenly spread across eligible "
    + "workers",
    "Number of duties on sunday should be evenly spread across eligible " + "workers",
    "Number of duties on bank holidays should be evenly spread across "
    + "eligible workers",
    "Number of duties should be evenly spread across eligible workers",
    "Number of Plouharnel duty should be evenly spread across workers working "
    + "on both sites",
    # To be categorized
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

constraints_repeat = [
    # Sequence
    "Less than 3 consecutive days off",
    "Number of consecutive days off less than or equal to 2",
    "Maximum 2 consecutive days off",
    "At least 2 consecutive night shifts",
    "At most 3 consecutive night shifts",
    # Sum
    "At least 1 shift off per week",
    "At least 2 shifts off per week",
    "At most 2 shifts off per week",
    "At least 1 night shift per week",
    "At most 4 night shifts per week",
    "60+ workers should do at most 4 duties per month",
    "60+ workers should not work more than 4 duties per month",
    # Order
    "No shift morning after night",
    "Shift night after afternoon",
    "Shift off after shift duty",
    "Shift off after duty",
    "1 shift off after shift duty",
    "1 day off after a duty",
]
