from typing import Dict, List

from core import Template, TemplateBlock
from utils.constants import Constants


# pylint: disable=R0801
def build_templates_list_fr(
    worker_options: Dict, shift_options: Dict
) -> List[Template]:
    return [
        Template(
            id="0",
            constraint_type="seq",
            text="Jean doit faire au plus 2 consultations consécutives",
            language="fr",
            # text="John should work at most 2 consecutive days off",
            blocks=[
                TemplateBlock(
                    name="worker",
                    type="dict",
                    options=worker_options,
                    placeholder="Jean",
                ),
                TemplateBlock(
                    name="text",
                    type="string",
                    options=[],
                    placeholder="doit faire",
                ),
                TemplateBlock(
                    name="operator",
                    type="string",
                    options=["at most", "at least", "exactly"],
                    placeholder="au plus",
                ),
                TemplateBlock(
                    name="#",
                    type="number",
                    options=[],
                    placeholder=2,
                ),
                TemplateBlock(
                    name="shift",
                    type="dict",
                    options=shift_options,
                    placeholder="consultations",
                ),
                TemplateBlock(
                    name="timing",
                    type="string",
                    options=["consecutive"],
                    placeholder="consecutives",
                ),
            ],
        ),
        Template(
            id="1",
            constraint_type="sum",
            text="John should work at least 1 shift off per week",
            language="fr",
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
            language="fr",
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
            language="fr",
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
            language="fr",
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
            language="fr",
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
            language="fr",
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
            language="fr",
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
